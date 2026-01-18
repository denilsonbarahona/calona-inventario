"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/firebase/storage";
import { X, Upload } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export default function ImageUpload({ images, onImagesChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = `products/${Date.now()}_${file.name}`;
      const url = await uploadImage(file, path);
      onImagesChange([...images, url]);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {images.length === 0 ? (
          <div className="space-y-2">
            <Upload className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600">Imagen del producto</p>
            <label className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 cursor-pointer">
              Agregar foto
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {images.map((url, index) => (
              <div key={index} className="relative">
                <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-300">
                  <Image src={url} alt={`Product ${index + 1}`} fill className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500">
                <Upload className="text-gray-400" size={32} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        )}
      </div>
      {uploading && <p className="text-sm text-gray-500">Subiendo imagen...</p>}
    </div>
  );
}
