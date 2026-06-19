import { useState } from 'react';
import { productsApi } from '../services/api';
import toast from 'react-hot-toast';
import { Upload, Download, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react';

const iCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

export default function ImportProductsPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Upload file
  const upload = async () => {
    if (!file) return toast.error('Please select a file');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);

      //await delay(10000);

      const { data } = await productsApi.importProducts(formData);

      if (!data.Success) {
        toast.error(data.Message || 'Import failed');
        return;
      }
      console.log(data);
      console.log(data.Data);
      setResult(data.Data);
      toast.success('Import completed successfully');
    } catch (err) {
      toast.error(err.response?.data?.Message ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      'Barcode',
      'Name',
      'Brand Name',
      'Generic Name',
      'Description',
      'Dosage Strength',
      'Unit',
      'Category Name',
      'Supplier Name',
      'Cost Price',
      'Selling Price',
      'Stock Quantity',
      'Reorder Level',
      'Requires Prescription',
      'Expiry Date',
      'Batch No.'
    ];

    const csv = headers.join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full overflow-hidden p-5 gap-5 bg-gray-50">

      {/* LEFT PANEL */}
      <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Import Products</h2>

        <p className="text-sm text-gray-500 mb-4">
          Upload CSV or Excel file to batch import products into inventory.
        </p>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-blue-500" />
            Supports CSV / XLSX
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            Auto validation enabled
          </div>

          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-red-500" />
            Duplicate barcode will be rejected
          </div>
        </div>

        <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          Tip: Always download the template before importing to avoid errors.
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">

        {/* HEADER */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-center justify-between">

          {/* LEFT */}
          <div>
            <h3 className="font-semibold text-gray-800">Upload File</h3>
            <p className="text-xs text-gray-500">
              Select a file then click upload to process products
            </p>
          </div>

          {/* RIGHT BUTTONS */}
          <div className="flex items-center gap-2">

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download size={16} />
              Template
            </button>

            <button
              onClick={upload}
              disabled={loading}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Upload size={16} />
              {loading ? 'Uploading...' : 'Upload & Process'}
            </button>

          </div>
        </div>

        {/* FILE INPUT CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <input
            type="file"
            accept=".csv,.xlsx"
            className={iCls}
            onChange={(e) => setFile(e.target.files[0])}
          />

          {file && (
            <div className="mt-3 text-sm text-gray-600">
              Selected file: <span className="font-medium">{file.name}</span>
            </div>
          )}
        </div>

        {/* RESULTS */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex-1 overflow-hidden flex flex-col">

            {/* RESULT HEADER */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Import Results</h3>

              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <RefreshCw size={12} />
                Clear
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="text-xs text-green-600">Success</div>
                <div className="text-lg font-bold text-green-700">
                  {result.SuccessCount}
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="text-xs text-red-600">Failed</div>
                <div className="text-lg font-bold text-red-700">
                  {result.FailedCount}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-xs text-blue-600">Total</div>
                <div className="text-lg font-bold text-blue-700">
                  {(result.SuccessCount || 0) + (result.FailedCount || 0)}
                </div>
              </div>
            </div>

            {/* RESULT LISTS */}
            <div className="flex-1 overflow-auto grid grid-cols-2 gap-4">

              {/* SUCCESS */}
              <div className="border border-gray-100 rounded-lg p-3 overflow-auto">
                <h4 className="text-sm font-semibold text-green-600 mb-2">
                  Successful
                </h4>

                {result.SuccessItems?.map((p, i) => (
                  <div key={i} className="text-xs text-gray-600 py-1 border-b border-gray-100">
                    <span className="text-green-600 font-bold">✓</span> {p.Name}
                  </div>
                ))}
              </div>

              {/* FAILED */}
              <div className="border border-gray-100 rounded-lg p-3 overflow-auto">
                <h4 className="text-sm font-semibold text-red-600 mb-2">
                  Failed
                </h4>

                {result.FailedItems?.map((p, i) => (
                  <div key={i} className="text-xs text-gray-600 py-1 border-b border-gray-100">
                    <span className="text-red-600 font-bold">✕</span> {p.Name}
                    <div className="text-red-400 ml-3">{p.Error}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}