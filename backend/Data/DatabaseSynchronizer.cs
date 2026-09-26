using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace PharmacyApi.Data;

/// <summary>Additive synchronization; removed columns and changed column types require explicit migrations.</summary>
public sealed class DatabaseSynchronizer(IConfiguration configuration, ILogger<DatabaseSynchronizer> logger)
{
    private static readonly Sql160ScriptGenerator Generator = new();
    private static string Sql(TSqlFragment fragment) { Generator.GenerateScript(fragment, out var text); return text; }
    private static string Quote(string name) => "[" + name.Replace("]", "]]") + "]";
    private static string Name(SchemaObjectName name) => (name.SchemaIdentifier?.Value ?? "dbo") + "." + name.BaseIdentifier.Value;
    private static string Normalize(string text) => Regex.Replace(text, @"[\s\[\]()]+", "").ToLowerInvariant();

    public static TSqlScript Parse(string text, string file)
    {
        var script = (TSqlScript)new TSql160Parser(true).Parse(new StringReader(text), out var errors);
        if (errors.Count != 0) throw new InvalidOperationException($"Invalid SQL in {file}: " + string.Join("; ", errors.Select(e => $"line {e.Line}: {e.Message}")));
        return script;
    }

    public async Task SynchronizeAsync(string scriptsRoot, CancellationToken cancellationToken = default)
    {
        var tablesPath = Path.Combine(scriptsRoot, "Tables");
        var proceduresPath = Path.Combine(scriptsRoot, "Stored Procedures");
        if (!Directory.Exists(tablesPath) || !Directory.Exists(proceduresPath))
            throw new DirectoryNotFoundException($"Database scripts are missing from {scriptsRoot}.");
        // Parse before opening a database, so malformed files cannot cause a partial deployment.
        var tables = Directory.GetFiles(tablesPath, "*.sql").Order().Select(file =>
            (File: file, Script: Parse(File.ReadAllText(file), file))).ToList();
        var procedures = Directory.GetFiles(proceduresPath, "*.sql").Order().Select(file =>
            (File: file, Script: Parse(File.ReadAllText(file), file))).ToList();
        if (tables.Count == 0 || procedures.Count == 0) throw new InvalidOperationException("Database script folders must not be empty.");
        var migrationsPath = Path.Combine(scriptsRoot, "Migrations");
        var migrations = Directory.Exists(migrationsPath) ? Directory.GetFiles(migrationsPath, "*.sql").Order().Select(file =>
            (File: file, Text: File.ReadAllText(file), Script: Parse(File.ReadAllText(file), file))).ToList() : [];
        var statements = tables.SelectMany(x => x.Script.Batches.SelectMany(b => b.Statements)).ToList();
        var creates = statements.OfType<CreateTableStatement>().ToList();
        if (tables.Any(t => t.Script.Batches.SelectMany(b => b.Statements).OfType<CreateTableStatement>().Count() != 1)
            || creates.Select(c => Name(c.SchemaObjectName)).Distinct(StringComparer.OrdinalIgnoreCase).Count() != creates.Count)
            throw new InvalidOperationException("Each table file must contain exactly one distinct CREATE TABLE.");
        if (migrations.Any(m => m.Script.Batches.SelectMany(b => b.Statements).Any(s => s is UseStatement)))
            throw new InvalidOperationException("Migrations must use the configured database; USE statements are not allowed.");
        if (statements.Any(s => s is not CreateTableStatement and not AlterTableAddTableElementStatement and not CreateIndexStatement and not UseStatement and not PredicateSetStatement))
            throw new InvalidOperationException("Table files may contain only CREATE TABLE, ALTER TABLE ADD, CREATE INDEX, USE and SET statements.");

        var builder = new SqlConnectionStringBuilder(configuration.GetConnectionString("Default") ?? throw new InvalidOperationException("Missing connection string 'Default'."));
        var database = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(database) || new[] { "master", "model", "msdb", "tempdb" }.Contains(database, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Default connection must specify an application database.");
        builder.InitialCatalog = "master";
        await using var master = new SqlConnection(builder.ConnectionString);
        await master.OpenAsync(cancellationToken);
        var lockResult = await master.ExecuteScalarAsync<int>("DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=60000; SELECT @r;", new { resource = "PharmacyApi.Schema:" + database });
        if (lockResult < 0) throw new InvalidOperationException("Could not acquire database startup lock.");
        try
        {
            if (await master.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.databases WHERE name=@database", new { database }) == 0)
                await master.ExecuteAsync($"CREATE DATABASE {Quote(database)}", commandTimeout: 120);
            builder.InitialCatalog = database;
            await using var connection = new SqlConnection(builder.ConnectionString);
            await connection.OpenAsync(cancellationToken);
            await connection.ExecuteAsync("SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; SET XACT_ABORT ON;");
            using var transaction = connection.BeginTransaction();
            try
            {
                foreach (var create in creates)
                {
                    var table = Name(create.SchemaObjectName);
                    if (!(create.SchemaObjectName.SchemaIdentifier?.Value ?? "dbo").Equals("dbo", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Only dbo tables are supported.");
                    if (await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(@table)", new { table }, transaction) == 0)
                    {
                        // Delay inline relationships until all referenced tables exist.
                        var relationships = create.Definition.TableConstraints.OfType<ForeignKeyConstraintDefinition>().ToList();
                        foreach (var relationship in relationships) create.Definition.TableConstraints.Remove(relationship);
                        try { await connection.ExecuteAsync(Sql(create), transaction: transaction); }
                        finally { foreach (var relationship in relationships) create.Definition.TableConstraints.Add(relationship); }
                        logger.LogInformation("Created table {Table}", table);
                    }
                    else
                    {
                        var columns = (await connection.QueryAsync<string>("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(@table)", new { table }, transaction)).ToHashSet(StringComparer.OrdinalIgnoreCase);
                        foreach (var column in create.Definition.ColumnDefinitions.Where(c => !columns.Contains(c.ColumnIdentifier.Value)))
                        {
                            var defaultConstraint = statements.OfType<AlterTableAddTableElementStatement>()
                                .Where(a => Name(a.SchemaObjectName).Equals(table, StringComparison.OrdinalIgnoreCase))
                                .SelectMany(a => a.Definition.TableConstraints).OfType<DefaultConstraintDefinition>()
                                .FirstOrDefault(d => d.Column.Value.Equals(column.ColumnIdentifier.Value, StringComparison.OrdinalIgnoreCase));
                            if (defaultConstraint != null && column.DefaultConstraint == null)
                            {
                                column.DefaultConstraint = new DefaultConstraintDefinition { Expression = defaultConstraint.Expression, ConstraintIdentifier = defaultConstraint.ConstraintIdentifier };
                            }
                            try { await connection.ExecuteAsync($"ALTER TABLE {Sql(create.SchemaObjectName)} ADD {Sql(column)};", transaction: transaction); }
                            catch (SqlException ex) { throw new InvalidOperationException($"Cannot add {table}.{column.ColumnIdentifier.Value}. A required column on a populated table needs a DEFAULT or an explicit backfill migration.", ex); }
                            logger.LogInformation("Added column {Table}.{Column}", table, column.ColumnIdentifier.Value);
                        }
                    }
                }
                await connection.ExecuteAsync("IF OBJECT_ID('dbo.__SchemaMigrations','U') IS NULL CREATE TABLE dbo.__SchemaMigrations (Name nvarchar(255) NOT NULL PRIMARY KEY, Hash varchar(64) NOT NULL, AppliedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());", transaction: transaction);
                foreach (var migration in migrations)
                {
                    var name = Path.GetFileName(migration.File);
                    var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(migration.Text)));
                    var existing = await connection.QuerySingleOrDefaultAsync<string>("SELECT Hash FROM dbo.__SchemaMigrations WHERE Name=@name", new { name }, transaction);
                    if (existing != null) { if (existing != hash) throw new InvalidOperationException($"Applied migration {name} was changed; add a new migration instead."); continue; }
                    foreach (var batch in migration.Script.Batches) await connection.ExecuteAsync(Sql(batch), transaction: transaction, commandTimeout: 120);
                    await connection.ExecuteAsync("INSERT dbo.__SchemaMigrations(Name,Hash) VALUES(@name,@hash)", new { name, hash }, transaction);
                }
                // All tables/columns exist before relationships and indexes are installed.
                foreach (var create in creates)
                {
                    foreach (var column in create.Definition.ColumnDefinitions)
                        if (column.DefaultConstraint != null)
                        {
                            var constraint = column.DefaultConstraint;
                            constraint.Column = column.ColumnIdentifier;
                            await AddConstraint(connection, transaction, create.SchemaObjectName, constraint);
                        }
                    foreach (var constraint in create.Definition.TableConstraints) await AddConstraint(connection, transaction, create.SchemaObjectName, constraint);
                }
                foreach (var alter in statements.OfType<AlterTableAddTableElementStatement>())
                {
                    if (alter.Definition.ColumnDefinitions.Count != 0) throw new InvalidOperationException("Define columns inside CREATE TABLE, rather than a separate ALTER TABLE.");
                    foreach (var constraint in alter.Definition.TableConstraints) await AddConstraint(connection, transaction, alter.SchemaObjectName, constraint);
                }
                foreach (var index in statements.OfType<CreateIndexStatement>())
                    if (await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.indexes WHERE object_id=OBJECT_ID(@table) AND name=@name", new { table = Name(index.OnName), name = index.Name.Value }, transaction) == 0)
                        await connection.ExecuteAsync(Sql(index), transaction: transaction);
                foreach (var procedure in procedures)
                {
                    var defs = procedure.Script.Batches.SelectMany(b => b.Statements).Where(s => s is CreateProcedureStatement or CreateOrAlterProcedureStatement).ToList();
                    if (defs.Count != 1) throw new InvalidOperationException($"Expected one procedure in {procedure.File}.");
                    var sql = Regex.Replace(Sql(defs[0]), @"\ACREATE\s+(?:OR\s+ALTER\s+)?PROCEDURE", "CREATE OR ALTER PROCEDURE", RegexOptions.IgnoreCase);
                    await connection.ExecuteAsync(sql, transaction: transaction);
                }
                // Bootstrap only an empty user table; restarts must never reset an existing account.
                if (await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users WITH (UPDLOCK,HOLDLOCK)", transaction: transaction) == 0)
                {
                    var passwordHash = BCrypt.Net.BCrypt.HashPassword("dev-admin-change-me");
                    await connection.ExecuteAsync("""
                        INSERT dbo.Users(Username,PasswordHash,FullName,Email,Phone,Role,IsActive,CreatedAt)
                        VALUES('admin',@passwordHash,'Administrator','','','Admin',1,GETDATE());
                        """, new { passwordHash }, transaction);
                    logger.LogInformation("Created initial admin account for empty database {Database}", database);
                }
                transaction.Commit();
                logger.LogInformation("Database {Database} synchronized: {Tables} tables, {Procedures} procedures", database, tables.Count, procedures.Count);
            }
            catch
            {
                // XACT_ABORT can already have rolled back the SQL transaction.
                try { transaction.Rollback(); } catch (InvalidOperationException) { }
                throw;
            }
        }
        finally { await master.ExecuteAsync("EXEC sys.sp_releaseapplock @Resource=@resource, @LockOwner='Session'", new { resource = "PharmacyApi.Schema:" + database }); }
    }

    private static async Task AddConstraint(SqlConnection connection, IDbTransaction transaction, SchemaObjectName tableName, ConstraintDefinition constraint)
    {
        var table = Name(tableName);
        bool exists;
        switch (constraint)
        {
            case DefaultConstraintDefinition d:
                exists = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id WHERE d.parent_object_id=OBJECT_ID(@table) AND c.name=@column", new { table, column = d.Column.Value }, transaction) > 0;
                break;
            case UniqueConstraintDefinition u:
                var keys = string.Join(",", u.Columns.Select(c => c.Column.MultiPartIdentifier.Identifiers.Last().Value));
                exists = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.indexes i WHERE i.object_id=OBJECT_ID(@table) AND i.is_unique=1 AND i.has_filter=0 AND (@primary=0 OR i.is_primary_key=1) AND (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=@keys", new { table, keys, primary = u.IsPrimaryKey ? 1 : 0 }, transaction) > 0;
                break;
            case ForeignKeyConstraintDefinition f:
                var mapping = string.Join(",", f.Columns.Zip(f.ReferencedTableColumns, (a, b) => a.Value + ":" + b.Value));
                exists = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(@table) AND fk.referenced_object_id=OBJECT_ID(@target) AND (SELECT STRING_AGG(CONVERT(nvarchar(max),pc.name+':'+rc.name),',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc JOIN sys.columns pc ON pc.object_id=fc.parent_object_id AND pc.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id WHERE fc.constraint_object_id=fk.object_id)=@mapping", new { table, target = Name(f.ReferenceTableName), mapping }, transaction) > 0;
                break;
            case CheckConstraintDefinition c:
                var definitions = await connection.QueryAsync<string>("SELECT definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(@table)", new { table }, transaction);
                exists = definitions.Any(d => Normalize(d) == Normalize(Sql(c.CheckCondition)));
                break;
            default: throw new InvalidOperationException($"Unsupported constraint in {table}.");
        }
        if (!exists) await connection.ExecuteAsync($"ALTER TABLE {Sql(tableName)} WITH CHECK ADD {Sql(constraint)};", transaction: transaction);
    }
}
