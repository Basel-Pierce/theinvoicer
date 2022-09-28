import 'focus-visible'
import '../styles/tailwind.css'
import { ToastContainer } from "react-toastify";
import type { AppProps } from "next/app";

require("react-toastify/dist/ReactToastify.css");

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <ToastContainer />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
