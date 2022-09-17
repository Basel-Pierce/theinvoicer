export default function ActionPanel() {
  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Install or Connect TronLink Extension
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            The Invoicer is running on TRON Ecosystem. Please install or connect
            the required Wallet to go forward.
          </p>
        </div>
        <div className="mt-3 text-sm">
          <a
            href="https://www.tronlink.org/"
            target="_blank"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Install TronLink
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
