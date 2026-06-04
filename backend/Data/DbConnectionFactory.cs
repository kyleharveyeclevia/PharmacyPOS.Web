using System.Data;
using Microsoft.Data.SqlClient;

namespace PharmacyApi.Data
{
    public interface IDbConnectionFactory { IDbConnection Create(); }

    public class SqlConnectionFactory : IDbConnectionFactory
    {
        private readonly string _cs;
        public SqlConnectionFactory(IConfiguration cfg)
            => _cs = cfg.GetConnectionString("Default")
               ?? throw new InvalidOperationException("Missing connection string 'Default'.");

        public IDbConnection Create()
        {
            var conn = new SqlConnection(_cs);
            conn.Open();
            return conn;
        }
    }
}
