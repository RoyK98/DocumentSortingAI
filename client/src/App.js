import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Upload, RefreshCw, Eye, Trash2, Folder, CheckCircle, XCircle } from 'lucide-react';
import './App.css';

function App() {
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [status, setStatus] = useState({ show: false, type: '', message: '' });
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch documents on component mount
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showStatus('error', 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    
    // Initialize progress for all files
    const initialProgress = acceptedFiles.map((file, index) => ({
      id: index,
      filename: file.name,
      progress: 0,
      status: 'uploading',
      message: 'Preparing...'
    }));
    setUploadProgress(initialProgress);

    try {
      // Create FormData with all files
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('files', file);
      });

      console.log(`Uploading ${acceptedFiles.length} files...`);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // Update all files with upload progress
          setUploadProgress(prev => prev.map(item => ({
            ...item,
            progress: percentCompleted,
            message: percentCompleted < 100 ? 'Uploading...' : 'Processing...'
          })));
        },
        timeout: 120000 // 2 minute timeout for multiple files
      });

      console.log('Server response:', response.data);

      // Update progress based on server response
      if (response.data.results && response.data.results.length > 0) {
        response.data.results.forEach((result, index) => {
          setUploadProgress(prev => prev.map((item, i) => 
            i === index ? {
              ...item,
              status: result.success ? 'success' : 'error',
              progress: result.success ? 100 : 0,
              message: result.success 
                ? `Uploaded to ${result.result.folder}` 
                : result.error || 'Upload failed'
            } : item
          ));
        });
      }

      // Show final status message
      const { successful, failed } = response.data;
      if (successful > 0 && failed === 0) {
        showStatus('success', `Successfully uploaded ${successful} file${successful > 1 ? 's' : ''}`);
      } else if (successful > 0 && failed > 0) {
        showStatus('error', `Uploaded ${successful} file${successful > 1 ? 's' : ''}, ${failed} failed`);
      } else if (failed > 0) {
        showStatus('error', `Failed to upload ${failed} file${failed > 1 ? 's' : ''}`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Mark all files as failed
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'error',
        progress: 0,
        message: error.response?.data?.error || error.message || 'Upload failed'
      })));
      
      showStatus('error', error.response?.data?.error || error.message || 'Upload failed');
    }

    // Refresh document list after all uploads complete
    setTimeout(() => {
      fetchDocuments();
      setUploading(false);
      setUploadProgress([]);
    }, 3000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: true // Enable multiple file selection
  });

  const deleteDocument = async (folder, filename) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      console.log(`Attempting to delete: ${folder}/${filename}`);
      
      const response = await axios.delete(`/api/documents/${folder}/${filename}`);
      
      if (response.data.success) {
        showStatus('success', 'Document deleted successfully');
        // Refresh the document list immediately
        await fetchDocuments();
      } else {
        showStatus('error', response.data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete document';
      showStatus('error', errorMessage);
    }
  };

  const deleteFolder = async (folder) => {
    const docCount = documents[folder]?.length || 0;
    const message = docCount > 0 
      ? `Are you sure you want to delete the folder "${folder}" and all ${docCount} document${docCount !== 1 ? 's' : ''} inside it? This action cannot be undone.`
      : `Are you sure you want to delete the folder "${folder}"? This action cannot be undone.`;
    
    if (!window.confirm(message)) return;

    try {
      console.log(`Attempting to delete folder: ${folder}`);
      
      const response = await axios.delete(`/api/folders/${encodeURIComponent(folder)}`);
      
      if (response.data.success) {
        showStatus('success', response.data.message || `Folder "${folder}" deleted successfully`);
        // Refresh the document list immediately
        await fetchDocuments();
      } else {
        showStatus('error', response.data.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete folder';
      showStatus('error', errorMessage);
    }
  };

  const openDocumentPreview = async (folder, document) => {
    setPreviewLoading(true);
    setPreviewDocument(null);

    try {
      console.log(`Attempting to preview: ${folder}/${document.stored_filename}`);
      
      const response = await axios.get(`/api/documents/${encodeURIComponent(folder)}/${encodeURIComponent(document.stored_filename)}/preview`, {
        responseType: 'blob'
      });

      const fileExtension = document.original_filename.split('.').pop().toLowerCase();
      const mimeType = getMimeType(fileExtension);
      
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      setPreviewDocument({
        name: document.original_filename,
        url: url,
        type: fileExtension,
        size: document.file_size,
        description: document.description
      });
    } catch (error) {
      console.error('Preview error:', error);
      showStatus('error', 'Failed to load document preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getMimeType = (extension) => {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const closePreview = () => {
    if (previewDocument?.url) {
      URL.revokeObjectURL(previewDocument.url);
    }
    setPreviewDocument(null);
    setPreviewLoading(false);
  };

  const showStatus = (type, message) => {
    setStatus({ show: true, type, message });
    setTimeout(() => {
      setStatus({ show: false, type: '', message: '' });
    }, 5000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} color="#28a745" />;
      case 'error':
        return <XCircle size={16} color="#dc3545" />;
      default:
        return <RefreshCw size={16} className="spinning" />;
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>Document Sorting AI</h1>
          <p>AI-powered document organization system</p>
        </div>

        <div className="main-content">
          {/* Upload Section */}
          <div className="upload-section">
            <h2>Upload Documents</h2>
            <div
              {...getRootProps()}
              className={`upload-area ${isDragActive ? 'dragover' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={48} color="#667eea" />
              <h3>Drop files here or click to select</h3>
              <p>Supports multiple PDF, DOCX, TXT, JPG, PNG files</p>
              <p className="upload-hint">You can select multiple files at once!</p>
            </div>

            <button
              className="upload-btn"
              disabled={uploading}
              onClick={() => {
                // Use the dropzone's input instead of a separate one
                const dropzoneInput = document.querySelector('.upload-area input[type="file"]');
                if (dropzoneInput) {
                  dropzoneInput.click();
                }
              }}
            >
              {uploading ? 'Uploading...' : 'Select Files'}
            </button>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="upload-progress">
                <h4>Upload Progress ({uploadProgress.length} files)</h4>
                {uploadProgress.map((item) => (
                  <div key={item.id} className={`progress-item ${item.status}`}>
                    <div className="progress-header">
                      <span className="filename">{item.filename}</span>
                      {getStatusIcon(item.status)}
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <div className="progress-message">{item.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Status Message */}
            {status.show && (
              <div className={`status-message status-${status.type}`}>
                {status.message}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="documents-section">
            <div className="documents-header">
              <h2>Organized Documents</h2>
              <button className="refresh-btn" onClick={fetchDocuments} disabled={loading}>
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading">
                <RefreshCw size={24} className="spinning" />
                Loading documents...
              </div>
            ) : Object.keys(documents).length === 0 ? (
              <div className="empty-state">
                <Folder size={48} />
                <p>No documents uploaded yet</p>
                <p>Upload your first document to get started</p>
              </div>
            ) : (
              Object.entries(documents).map(([folder, docs]) => (
                <div key={folder} className="folder">
                  <div className="folder-header">
                    <div className="folder-info">
                      <Folder size={16} />
                      <span>{folder} ({docs.length} document{docs.length !== 1 ? 's' : ''})</span>
                    </div>
                    <button
                      className="action-btn delete-btn folder-delete-btn"
                      title={`Delete folder "${folder}" and all its contents`}
                      onClick={() => deleteFolder(folder)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="document-list">
                    {docs.map((doc, index) => (
                      <div key={index} className="document-item">
                        <div className="document-info">
                          <div className="document-name">{doc.original_filename}</div>
                          <div className="document-meta">
                            {doc.description} • {formatFileSize(doc.file_size)} • {formatDate(doc.upload_timestamp)}
                          </div>
                        </div>
                        <div className="document-actions">
                          <button
                            className="action-btn view-btn"
                            title="View document"
                            onClick={() => openDocumentPreview(folder, doc)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            title="Delete document"
                            onClick={() => deleteDocument(folder, doc.stored_filename)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {(previewDocument || previewLoading) && (
        <div className="preview-modal-overlay" onClick={closePreview}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewDocument?.name || 'Loading...'}</h3>
              <button className="close-btn" onClick={closePreview}>
                ×
              </button>
            </div>
            
            {previewLoading ? (
              <div className="preview-loading">
                <RefreshCw size={24} className="spinning" />
                Loading document...
              </div>
            ) : previewDocument ? (
              <div className="preview-content">
                {previewDocument.type === 'pdf' ? (
                  <iframe
                    src={previewDocument.url}
                    title={previewDocument.name}
                    width="100%"
                    height="500px"
                  />
                ) : previewDocument.type === 'jpg' || previewDocument.type === 'jpeg' || previewDocument.type === 'png' ? (
                  <img
                    src={previewDocument.url}
                    alt={previewDocument.name}
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="text-preview">
                    <p>Document: {previewDocument.name}</p>
                    <p>Size: {formatFileSize(previewDocument.size)}</p>
                    <p>Description: {previewDocument.description}</p>
                    <a href={previewDocument.url} download={previewDocument.name} className="download-btn">
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 