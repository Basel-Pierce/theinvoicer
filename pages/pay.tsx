import React, { FC, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { QrReader } from "react-qr-reader";
import { toast } from "react-toastify";
import { useTronlink } from "../hooks";
import Sidebar from "../components/sidebar";
import Top from "../components/top";
import { Invoice } from "../data/types";
import ActionPanel from "../components/actionPanel";

interface Props {
  data?: Invoice;
  onChange?: (invoice: Invoice) => void;
}

const Pay: FC<Props> = ({ data, onChange }) => {
  const {
    address, // The connected wallet address
    isConnected, // A boolean checking it is connected or not
  } = useTronlink();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const router = useRouter();

  return (
    <div className="relative">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="md:pl-64">
        <div className="mx-auto flex max-w-4xl flex-col md:px-8 xl:px-0">
          <Top
            setSidebarOpen={setSidebarOpen}
            address={address}
            isConnected={isConnected}
          />

          <main className="flex-1">
            <div className="py-6">
              <QrReader
                onResult={(result, error) => {
                  if (!!result) {
                    router.push(result?.text);
                  }

                  if (!!error) {
                    console.log(error);
                  }
                }}
                style={{ width: "100%" }}
              />
              {!isConnected && <ActionPanel />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Pay;
