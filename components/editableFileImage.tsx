import React, { FC, useRef, useState } from "react";
import Slider from "rc-slider";
import useOnClickOutside from "../hooks/useOnClickOutside";
import "rc-slider/assets/index.css";

interface Props {
  className?: string;
  placeholder?: string;
  value?: string;
  width?: number;
  onChangeImage?: (value: string) => void;
  onChangeWidth?: (value: number) => void;
}

const EditableFileImage: FC<Props> = ({
  className,
  placeholder,
  value,
  width,
  onChangeImage,
  onChangeWidth,
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const widthWrapper = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const marks = {
    128: "128px",
    256: "256px",
  };

  const handleClickOutside = () => {
    if (isEditing) {
      setIsEditing(false);
    }
  };

  useOnClickOutside(widthWrapper, handleClickOutside);

  const handleUpload = () => {
    fileInput?.current?.click();
  };

  const handleChangeImage = () => {
    if (fileInput?.current?.files) {
      const files = fileInput.current.files;

      if (files.length > 0 && typeof onChangeImage === "function") {
        const reader = new FileReader();

        reader.addEventListener("load", () => {
          if (typeof reader.result === "string") {
            onChangeImage(reader.result);
          }
        });

        reader.readAsDataURL(files[0]);
      }
    }
  };

  const handleChangeWidth = (value: number | number[]) => {
    if (typeof onChangeWidth === "function") {
      onChangeWidth(typeof value === "object" ? value[0] : value);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const clearImage = () => {
    if (typeof onChangeImage === "function") {
      onChangeImage("");
    }
  };

  return (
    <div className={`image mb-5 text-sm ${className ? className : ""}`}>
      {!value ? (
        <button
          type="button"
          className="cursor-pointer border-dashed border border-gray-400 w-32 h-8 uppercase text-gray-400"
          onClick={handleUpload}
        >
          {placeholder}
        </button>
      ) : (
        <div className="relative" style={{ maxWidth: width || 128 }}>
          <img
            src={value}
            alt={placeholder}
            style={{ maxWidth: width || 128 }}
            className="block"
          />
          <button
            type="button"
            className="cursor-pointer border-dashed border border-gray-400 absolute w-full h-full bg-white top-0 left-0 opacity-0 hover:opacity-95 uppercase text-gray-400"
            onClick={handleUpload}
          >
            Change Image
          </button>
          <button type="button" className="image__edit" onClick={handleEdit}>
            Resize Image
          </button>
          <button type="button" className="image__remove" onClick={clearImage}>
            Remove
          </button>
          {isEditing && (
            <div ref={widthWrapper} className="image__width-wrapper">
              <Slider
                min={128}
                max={256}
                marks={marks}
                included={false}
                step={1}
                onChange={handleChangeWidth}
                defaultValue={width || 128}
              />
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInput}
        tabIndex={-1}
        type="file"
        accept="image/*"
        className="absolute w-px h-px p-0 -m-px overflow-hidden border-0"
        onChange={handleChangeImage}
      />
    </div>
  );
};

export default EditableFileImage;
