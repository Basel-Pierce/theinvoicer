import React, { FC, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import format from "date-fns/format";
// @ts-ignore
import { useScreenshot } from "use-react-screenshot";
import { Web3Storage, File } from "web3.storage";
import { toast } from "react-toastify";
import { useTronlink } from "../hooks";
import Sidebar from "../components/sidebar";
import Top from "../components/top";
import { Invoice, ProductLine } from "../data/types";
import { initialInvoice, initialProductLine } from "../data/initialData";
import EditableInput from "../components/editableInput";
import EditableSelect from "../components/editableSelect";
import EditableTextarea from "../components/editableTextarea";
import EditableCalendarInput from "../components/editableCalendarInput";
import EditableFileImage from "../components/editableFileImage";
import countryList from "../data/countryList";
import stableList from "../data/stableList";
import Document from "../components/document";
import Page from "../components/page";
import View from "../components/view";
import Text from "../components/text";
import Spinner from "../components/spinner";
import ActionPanel from "../components/actionPanel";
import Link from "next/link";

interface Props {
  data?: Invoice;
  onChange?: (invoice: Invoice) => void;
}

const Create: FC<Props> = ({ data, onChange }) => {
  const {
    address, // The connected wallet address
    walletName, // The wallet name
    trxBalance, // The wallet TRX balance
    isConnected, // A boolean checking it is connected or not
    tronWeb,
  } = useTronlink();

  const [image, takeScreenshot] = useScreenshot();
  const [watermarkImage, setWatermarkImage] = useState();

  const router = useRouter();
  const ref = useRef<HTMLElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice>(
    data ? { ...data } : { ...initialInvoice }
  );
  const [subTotal, setSubTotal] = useState<number>();
  const [saleTax, setSaleTax] = useState<number>();
  const [generating, setGenerating] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [link, setLink] = useState<string>();

  const dateFormat = "MMM dd, yyyy";
  const invoiceDate =
    invoice.invoiceDate !== "" ? new Date(invoice.invoiceDate) : new Date();
  const invoiceDueDate =
    invoice.invoiceDueDate !== ""
      ? new Date(invoice.invoiceDueDate)
      : new Date(invoiceDate.valueOf());

  if (invoice.invoiceDueDate === "") {
    invoiceDueDate.setDate(invoiceDueDate.getDate() + 30);
  }

  const rotate = function (target: any) {
    const context = target.getContext("2d");
    const text = "[PAID]";
    const metrics = context.measureText(text);
    const x = target.width / 2 - (metrics.width + 90);
    const y = target.height / 2 + 90;

    context.translate(x, y);
    context.globalAlpha = 0.5;
    context.fillStyle = "#f01e2c";
    context.font = "90px Verdana";
    context.rotate((-35 * Math.PI) / 180);
    context.fillText(text, 0, 0);
    return target;
  };

  const upload = async (image: any) => {
    try {
      const invoiceAmount =
        typeof subTotal !== "undefined" && typeof saleTax !== "undefined"
          ? subTotal + saleTax
          : 0;

      if (invoiceAmount === 0) {
        toast.error("Total should be greater than zero", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      const convert = require("ethereum-unit-converter");

      const InvoicerContract = await tronWeb
        ?.contract()
        .at(process.env.NEXT_PUBLIC_INVOICER);

      const rawCreationPrice = await InvoicerContract.getCreationPrice().call();

      const enoughBalance =
        Number(
          convert(process.env.NEXT_PUBLIC_CREATE_INVOICE_COST, "mwei").wei
        ) + Number(rawCreationPrice.toString());

      if (enoughBalance > trxBalance) {
        toast.error(
          `Not enough TRX balance to pay the transaction. We recommend at least ${
            convert(enoughBalance, "wei").mwei
          } TRX in wallet`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          }
        );
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      const watermarkjs = require("watermarkjs");
      const { src: watermarkImage } = await watermarkjs([image]).image(rotate);
      setWatermarkImage(watermarkImage);
      const client = new Web3Storage({
        token: process.env.NEXT_PUBLIC_WEB3_STORAGE!,
      });
      const [original, paid] = await Promise.all([
        fetch(image),
        fetch(watermarkImage),
      ]);
      const originalBlob = await original.blob();
      const paidBlob = await paid.blob();
      const names = ["invoice.png", "paid.png"];
      const files = [
        new File([originalBlob], names[0], { type: "image/png" }),
        new File([paidBlob], names[1], { type: "image/png" }),
      ];
      const imagesCid = await client.put(files);
      const metadata = [
        new File(
          [
            new Blob(
              [
                JSON.stringify({
                  name: "Invoice",
                  description: "Invoice",
                  image: `ipfs://${imagesCid}/${names[0]}`,
                }),
              ],
              { type: "application/json" }
            ),
          ],
          "metadata"
        ),
        new File(
          [
            new Blob(
              [
                JSON.stringify({
                  name: "Paid Invoice",
                  description: "Paid Invoice",
                  image: `ipfs://${imagesCid}/${names[1]}`,
                }),
              ],
              { type: "application/json" }
            ),
          ],
          "metadata_paid"
        ),
      ];
      const metadatasCid = await client.put(metadata);

      try {
        const tx = await InvoicerContract.createInvoice(
          // "ipfs://bafybeiagxlzoaecpfuhknb6jvwbitk4pb5badvsedfzf5agltcok5mptpq/metadata",
          `ipfs://${metadatasCid}/metadata`,
          invoice.currency === "USDT"
            ? Number(convert(invoiceAmount, "mwei").wei)
            : convert(invoiceAmount, "ether").wei,
          invoice.currency === "USDT"
            ? process.env.NEXT_PUBLIC_USDT
            : process.env.NEXT_PUBLIC_USDD
        ).send({
          feeLimit: 100000000,
          callValue: rawCreationPrice,
        });

        let result;

        do {
          result = await tronWeb?.getEventByTransactionID(tx);
        } while (result.length === 0);

        const eventIndex = result.findIndex(
          (item: { name: string }) => item.name === "InvoiceListed"
        );

        if (eventIndex === -1) {
          toast.error("Transaction error", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
          setGenerating(false);
          setDisabled(false);
          return false;
        }

        setDone(true);
        setLink(`/invoice/${result[eventIndex].result.invoiceId}`);
      } catch (e) {
        console.log(e);
        toast.error("Something wrong happened", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
        setGenerating(false);
        setDisabled(false);
        return false;
      }

      setGenerating(false);
      setDisabled(false);
    } catch (e) {
      setGenerating(false);
      setDisabled(false);
    }
  };

  const getImage = () => {
    if (!generating) {
      setGenerating(true);
      setDisabled(true);
      takeScreenshot(ref.current).then(upload);
    }
  };

  const handleChange = (name: keyof Invoice, value: string | number) => {
    if (name !== "productLines") {
      const newInvoice = { ...invoice };

      if (name === "logoWidth" && typeof value === "number") {
        newInvoice[name] = value;
      } else if (name !== "logoWidth" && typeof value === "string") {
        newInvoice[name] = value;
      }

      setInvoice(newInvoice);
    }
  };

  const handleProductLineChange = (
    index: number,
    name: keyof ProductLine,
    value: string
  ) => {
    const productLines = invoice.productLines.map((productLine, i) => {
      if (i === index) {
        const newProductLine = { ...productLine };

        if (name === "description") {
          newProductLine[name] = value;
        } else {
          if (
            value[value.length - 1] === "." ||
            (value[value.length - 1] === "0" && value.includes("."))
          ) {
            newProductLine[name] = value;
          } else {
            const n = parseFloat(value);

            newProductLine[name] = (n ? n : 0).toString();
          }
        }

        return newProductLine;
      }

      return { ...productLine };
    });

    setInvoice({ ...invoice, productLines });
  };

  const handleRemove = (i: number) => {
    const productLines = invoice.productLines.filter(
      (productLine, index) => index !== i
    );

    setInvoice({ ...invoice, productLines });
  };

  const handleAdd = () => {
    const productLines = [...invoice.productLines, { ...initialProductLine }];

    setInvoice({ ...invoice, productLines });
  };

  const calculateAmount = (quantity: string, rate: string) => {
    const quantityNumber = parseFloat(quantity);
    const rateNumber = parseFloat(rate);
    const amount =
      quantityNumber && rateNumber ? quantityNumber * rateNumber : 0;

    return amount.toFixed(2);
  };

  useEffect(() => {
    let subTotal = 0;

    invoice.productLines.forEach((productLine) => {
      const quantityNumber = parseFloat(productLine.quantity);
      const rateNumber = parseFloat(productLine.rate);
      const amount =
        quantityNumber && rateNumber ? quantityNumber * rateNumber : 0;

      subTotal += amount;
    });

    setSubTotal(subTotal);
  }, [invoice.productLines]);

  useEffect(() => {
    const match = invoice.taxLabel.match(/(\d+)%/);
    const taxRate = match ? parseFloat(match[1]) : 0;
    const saleTax = subTotal ? (subTotal * taxRate) / 100 : 0;

    setSaleTax(saleTax);
  }, [subTotal, invoice.taxLabel]);

  useEffect(() => {
    if (onChange) {
      onChange(invoice);
    }
  }, [onChange, invoice]);

  return (
    <div>
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
              {/* <div className="px-4 sm:px-6 md:px-0">
                <h1 className="text-2xl font-semifont-bold text-gray-900">
                  Preview
                </h1>
              </div> */}
              {isConnected && !done && (
                <div className="px-4 sm:px-6 md:px-0">
                  {/* Replace with your content */}

                  <div className="py-4 relative">
                    {generating && (
                      <div className="absolute top-0 w-full h-full z-50 bg-white/90">
                        <div className="w-full h-full relative">
                          <div className="flex justify-center items-center absolute inset-0">
                            <Spinner styles="h-10 w-10 text-black" />
                            <p className="text-gray-800 text-lg ml-3 font-semibold">
                              Generating invoice (be aware of the TronLink modal
                              to sign the transaction)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={ref}>
                      <Document>
                        <Page className="relative bg-white border border-grey-100 sm:rounded-lg p-6">
                          <View className="flex">
                            <View className="w-1/2">
                              <EditableFileImage
                                className="logo"
                                placeholder="Your Logo"
                                value={invoice.logo}
                                width={invoice.logoWidth}
                                onChangeImage={(value) =>
                                  handleChange("logo", value)
                                }
                                onChangeWidth={(value) =>
                                  handleChange("logoWidth", value)
                                }
                              />
                              <EditableInput
                                className="text-xl font-bold"
                                placeholder="Your Company"
                                value={invoice.companyName}
                                onChange={(value) =>
                                  handleChange("companyName", value)
                                }
                                autoFocus={true}
                              />
                              <EditableInput
                                placeholder="Your Name"
                                value={invoice.name}
                                onChange={(value) =>
                                  handleChange("name", value)
                                }
                              />
                              <EditableInput
                                placeholder="Company's Address"
                                value={invoice.companyAddress}
                                onChange={(value) =>
                                  handleChange("companyAddress", value)
                                }
                              />
                              <EditableInput
                                placeholder="City, State Zip"
                                value={invoice.companyAddress2}
                                onChange={(value) =>
                                  handleChange("companyAddress2", value)
                                }
                              />
                              <EditableSelect
                                options={countryList}
                                value={invoice.companyCountry}
                                onChange={(value) =>
                                  handleChange("companyCountry", value)
                                }
                              />
                            </View>
                            <View className="w-1/2">
                              <EditableInput
                                className="text-3xl right font-bold"
                                placeholder="Invoice"
                                value={invoice.title}
                                onChange={(value) =>
                                  handleChange("title", value)
                                }
                              />
                            </View>
                          </View>

                          <View className="flex mt-40">
                            <View className="w-1/2">
                              <EditableInput
                                className="font-bold mb-5"
                                value={invoice.billTo}
                                onChange={(value) =>
                                  handleChange("billTo", value)
                                }
                              />
                              <EditableInput
                                placeholder="Your Client's Name"
                                value={invoice.clientName}
                                onChange={(value) =>
                                  handleChange("clientName", value)
                                }
                              />
                              <EditableInput
                                placeholder="Client's Address"
                                value={invoice.clientAddress}
                                onChange={(value) =>
                                  handleChange("clientAddress", value)
                                }
                              />
                              <EditableInput
                                placeholder="City, State Zip"
                                value={invoice.clientAddress2}
                                onChange={(value) =>
                                  handleChange("clientAddress2", value)
                                }
                              />
                              <EditableSelect
                                options={countryList}
                                value={invoice.clientCountry}
                                onChange={(value) =>
                                  handleChange("clientCountry", value)
                                }
                              />
                            </View>
                            <View className="w-1/2">
                              <View className="flex mb-5">
                                <View className="w-2/5">
                                  <EditableInput
                                    className="font-bold"
                                    value={invoice.invoiceTitleLabel}
                                    onChange={(value) =>
                                      handleChange("invoiceTitleLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-3/5">
                                  <EditableInput
                                    placeholder="INV-1"
                                    value={invoice.invoiceTitle}
                                    onChange={(value) =>
                                      handleChange("invoiceTitle", value)
                                    }
                                  />
                                </View>
                              </View>
                              <View className="flex mb-5">
                                <View className="w-2/5">
                                  <EditableInput
                                    className="font-bold"
                                    value={invoice.invoiceDateLabel}
                                    onChange={(value) =>
                                      handleChange("invoiceDateLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-3/5">
                                  <EditableCalendarInput
                                    value={format(invoiceDate, dateFormat)}
                                    selected={invoiceDate}
                                    onChange={(date) =>
                                      handleChange(
                                        "invoiceDate",
                                        date && !Array.isArray(date)
                                          ? format(date, dateFormat)
                                          : ""
                                      )
                                    }
                                  />
                                </View>
                              </View>
                              <View className="flex mb-5">
                                <View className="w-2/5">
                                  <EditableInput
                                    className="font-bold"
                                    value={invoice.invoiceDueDateLabel}
                                    onChange={(value) =>
                                      handleChange("invoiceDueDateLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-3/5">
                                  <EditableCalendarInput
                                    value={format(invoiceDueDate, dateFormat)}
                                    selected={invoiceDueDate}
                                    onChange={(date) =>
                                      handleChange(
                                        "invoiceDueDate",
                                        date && !Array.isArray(date)
                                          ? format(date, dateFormat)
                                          : ""
                                      )
                                    }
                                  />
                                </View>
                              </View>
                            </View>
                          </View>

                          <View className="mt-30 bg-gray-600 flex">
                            <View className="w-1/2 p-4-8">
                              <EditableInput
                                className="text-white text-sm font-bold bg-transparent"
                                value={invoice.productLineDescription}
                                onChange={(value) =>
                                  handleChange("productLineDescription", value)
                                }
                              />
                            </View>
                            <View className="w-2/12 p-4-8">
                              <EditableInput
                                className="text-white text-sm font-bold bg-transparent right"
                                value={invoice.productLineQuantity}
                                onChange={(value) =>
                                  handleChange("productLineQuantity", value)
                                }
                              />
                            </View>
                            <View className="w-2/12 p-4-8">
                              <EditableInput
                                className="text-white text-sm font-bold bg-transparent right"
                                value={invoice.productLineQuantityRate}
                                onChange={(value) =>
                                  handleChange("productLineQuantityRate", value)
                                }
                              />
                            </View>
                            <View className="w-2/12 p-4-8">
                              <EditableInput
                                className="text-white text-sm font-bold bg-transparent right"
                                value={invoice.productLineQuantityAmount}
                                onChange={(value) =>
                                  handleChange(
                                    "productLineQuantityAmount",
                                    value
                                  )
                                }
                              />
                            </View>
                          </View>

                          {invoice.productLines.map((productLine, i) => {
                            return (
                              <View
                                key={i}
                                className="relative border-b border-gray-100 flex row"
                              >
                                <View className="w-1/2 p-4-8 pb-10">
                                  <EditableTextarea
                                    className="text-gray-600 text-sm"
                                    rows={2}
                                    placeholder="Enter item name/description"
                                    value={productLine.description}
                                    onChange={(value) =>
                                      handleProductLineChange(
                                        i,
                                        "description",
                                        value
                                      )
                                    }
                                  />
                                </View>
                                <View className="w-2/12 p-4-8 pb-10">
                                  <EditableInput
                                    className="text-gray-600 text-sm right"
                                    value={productLine.quantity}
                                    onChange={(value) =>
                                      handleProductLineChange(
                                        i,
                                        "quantity",
                                        value
                                      )
                                    }
                                  />
                                </View>
                                <View className="w-2/12 p-4-8 pb-10">
                                  <EditableInput
                                    className="text-gray-600 text-sm right"
                                    value={productLine.rate}
                                    onChange={(value) =>
                                      handleProductLineChange(i, "rate", value)
                                    }
                                  />
                                </View>
                                <View className="w-2/12 p-4-8 pb-10">
                                  <Text className="text-gray-600 text-sm right">
                                    {calculateAmount(
                                      productLine.quantity,
                                      productLine.rate
                                    )}
                                  </Text>
                                </View>
                                <button
                                  className="link row__remove"
                                  aria-label="Remove Row"
                                  title="Remove Row"
                                  onClick={() => handleRemove(i)}
                                >
                                  <span className="icon icon-remove bg-red-500"></span>
                                </button>
                              </View>
                            );
                          })}

                          <View className="flex">
                            <View className="w-1/2 mt-10">
                              <button
                                className="link text-sm"
                                onClick={handleAdd}
                              >
                                <span className="icon icon-add bg-green-500 mr-10"></span>
                                Add Item
                              </button>
                            </View>
                            <View className="w-1/2 mt-20">
                              <View className="flex">
                                <View className="w-1/2 p-5">
                                  <EditableInput
                                    className="text-sm"
                                    value={invoice.subTotalLabel}
                                    onChange={(value) =>
                                      handleChange("subTotalLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-1/2 p-5">
                                  <Text className="right text-sm font-bold text-gray-600">
                                    {subTotal?.toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                              <View className="flex">
                                <View className="w-1/2 p-5">
                                  <EditableInput
                                    className="text-sm"
                                    value={invoice.taxLabel}
                                    onChange={(value) =>
                                      handleChange("taxLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-1/2 p-5">
                                  <Text className="right text-sm font-bold text-gray-600">
                                    {saleTax?.toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                              <View className="flex bg-gray-100 p-5">
                                <View className="w-1/2 p-5">
                                  <EditableInput
                                    className="bg-transparent font-bold text-sm"
                                    value={invoice.totalLabel}
                                    onChange={(value) =>
                                      handleChange("totalLabel", value)
                                    }
                                  />
                                </View>
                                <View className="w-1/2 p-5 flex">
                                  {/* <EditableInput
                                    className="text-gray-600 bg-transparent text-sm font-bold right ml-30"
                                    value={invoice.currency}
                                    onChange={(value) =>
                                      handleChange("currency", value)
                                    }
                                  /> */}
                                  <EditableSelect
                                    className="text-gray-600 bg-transparent text-sm font-bold ml-30"
                                    options={stableList}
                                    value={invoice.currency}
                                    onChange={(value) =>
                                      handleChange("currency", value)
                                    }
                                  />
                                  <Text className="right font-bold text-sm text-gray-600 w-auto">
                                    {(typeof subTotal !== "undefined" &&
                                    typeof saleTax !== "undefined"
                                      ? subTotal + saleTax
                                      : 0
                                    ).toFixed(2)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* <View className="mt-20">
                          <EditableInput
                            className="font-bold w-full"
                            value={invoice.notesLabel}
                            onChange={(value) =>
                              handleChange("notesLabel", value)
                            }
                          />
                          <EditableTextarea
                            className="w-full"
                            rows={2}
                            value={invoice.notes}
                            onChange={(value) => handleChange("notes", value)}
                          />
                        </View>
                        <View className="mt-20">
                          <EditableInput
                            className="font-bold w-full"
                            value={invoice.termLabel}
                            onChange={(value) =>
                              handleChange("termLabel", value)
                            }
                          />
                          <EditableTextarea
                            className="w-full"
                            rows={2}
                            value={invoice.term}
                            onChange={(value) => handleChange("term", value)}
                          />
                        </View> */}
                        </Page>
                      </Document>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={getImage}
                      type="button"
                      disabled={disabled}
                      className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Generate Invoice
                    </button>
                  </div>

                  {/* <img src={image} />
                  <img src={watermarkImage} /> */}
                  {/* /End replace */}
                </div>
              )}

              {isConnected && done && link && (
                <>
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        The Invoice was generated!
                      </h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          Share this link to your client to pay for your
                          services: {process.env.NEXT_PUBLIC_ABSOLUTE_URL}
                          {link}
                        </p>
                      </div>
                      <div className="mt-3 text-sm">
                        <Link href={link}>
                          <a className="font-medium text-indigo-600 hover:text-indigo-500">
                            View the Invoice
                            <span aria-hidden="true"> &rarr;</span>
                          </a>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => router.reload()}
                      type="button"
                      className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Generate a new Invoice
                    </button>
                  </div>
                </>
              )}

              {!isConnected && <ActionPanel />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Create;
