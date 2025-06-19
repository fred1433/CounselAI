'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button } from './ui/button';
import './ContractEditor.css'; // Reuse some styles

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);
      if (fileRejections.length > 0) {
        setError(fileRejections[0].errors[0].message);
        setSelectedFile(null);
        onFileSelect(null);
        return;
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
      ],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  });

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    setError(null);
  };

  return (
    <div className="file-uploader-container mb-4">
      <h3 className="text-lg font-semibold mb-2">
        Upload a Template (Optional)
      </h3>
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag & drop a file here, or click to select one</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          (.docx, .pdf, .txt, .md accepted, max 5MB)
        </p>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {selectedFile && (
        <div className="mt-4 p-2 border rounded-md bg-gray-50 flex justify-between items-center">
          <span className="text-sm">
            Selected: <strong>{selectedFile.name}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={removeFile}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 