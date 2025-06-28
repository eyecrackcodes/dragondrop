import React, { useState } from "react";
import { TerminationDocument } from "../types";
import { format } from "date-fns";
import {
  XMarkIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface DocumentViewerProps {
  documents: TerminationDocument[];
  initialDocumentIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  initialDocumentIndex = 0,
  isOpen,
  onClose,
  employeeName,
}) => {
  const [currentDocumentIndex, setCurrentDocumentIndex] =
    useState(initialDocumentIndex);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || documents.length === 0) return null;

  const currentDocument = documents[currentDocumentIndex];

  const getDocumentTypeIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("word") || fileType.includes("doc")) return "📝";
    if (fileType.includes("excel") || fileType.includes("sheet")) return "📊";
    return "📎";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      termination_letter: "bg-red-100 text-red-800",
      resignation_letter: "bg-blue-100 text-blue-800",
      final_pay_stub: "bg-green-100 text-green-800",
      exit_interview: "bg-purple-100 text-purple-800",
      equipment_return: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      termination_letter: "Termination Letter",
      resignation_letter: "Resignation Letter",
      final_pay_stub: "Final Pay Stub",
      exit_interview: "Exit Interview",
      equipment_return: "Equipment Return",
      other: "Other Document",
    };
    return labels[category as keyof typeof labels] || "Document";
  };

  const handlePrevious = () => {
    setCurrentDocumentIndex((prev) =>
      prev > 0 ? prev - 1 : documents.length - 1
    );
  };

  const handleNext = () => {
    setCurrentDocumentIndex((prev) =>
      prev < documents.length - 1 ? prev + 1 : 0
    );
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const generateMockDocumentContent = (doc: any) => {
    const { category, fileName, uploadedBy } = doc;

    let content = "";
    const date = new Date().toLocaleDateString();

    switch (category) {
      case "resignation_letter":
        content = `RESIGNATION LETTER

Date: ${date}
To: Human Resources Department

Dear Team,

I am writing to formally notify you of my resignation from my position. My last day of work will be two weeks from today's date.

I appreciate the opportunities for professional and personal growth during my time here. I am committed to ensuring a smooth transition of my responsibilities.

Thank you for your understanding.

Sincerely,
${uploadedBy}

---
This is a mock document for demonstration purposes.`;
        break;

      case "termination_letter":
        content = `TERMINATION NOTICE

Date: ${date}
Employee: ${employeeName || "Employee Name"}
Position: [Position]

This letter serves as formal notification of the termination of employment.

Effective Date: ${date}
Reason: [As per company policy]

Please contact HR for information regarding final paycheck, benefits, and return of company property.

Signed,
${uploadedBy}

---
This is a mock document for demonstration purposes.`;
        break;

      case "exit_interview":
        content = `EXIT INTERVIEW SUMMARY

Date: ${date}
Employee: ${employeeName || "Employee Name"}
Interviewer: ${uploadedBy}

Summary of Discussion:
- Overall experience with the company
- Feedback on management and colleagues
- Suggestions for improvement
- Reason for leaving

Recommendations: [To be reviewed by HR]

---
This is a mock document for demonstration purposes.`;
        break;

      default:
        content = `DOCUMENT: ${fileName}

Date: ${date}
Created by: ${uploadedBy}

This document contains information related to employee records and HR processes.

For questions regarding this document, please contact the HR department.

---
This is a mock document for demonstration purposes.`;
    }

    return content;
  };

  const handleDownload = () => {
    try {
      // Check if we have a real document URL from Firebase storage
      if (
        currentDocument.fileUrl &&
        currentDocument.fileUrl.startsWith("https://") &&
        !currentDocument.fileUrl.includes("mock://") &&
        !currentDocument.fileUrl.includes("demo://") &&
        !currentDocument.fileUrl.includes("placeholder")
      ) {
        console.log(
          "📁 Downloading real document from Firebase Storage:",
          currentDocument.fileUrl
        );

        // Real Firebase storage download
        const link = document.createElement("a");
        link.href = currentDocument.fileUrl;
        link.download = currentDocument.fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`✅ Document download initiated: ${currentDocument.fileName}`);
        return;
      }

      console.log(
        "📄 Generating demo document content for:",
        currentDocument.fileName
      );

      // Generate sample document content for demo/missing documents
      const content = generateMockDocumentContent(currentDocument);

      // Create a blob with the content
      const blob = new Blob([content], { type: "text/plain" });

      // Create download URL
      const url = window.URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = currentDocument.fileName.replace(
        /\.(pdf|docx?|xlsx?)$/i,
        ".txt"
      );
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show feedback with note about demo content
      alert(
        `✅ Document downloaded (demo content): ${currentDocument.fileName}\n\nNote: This is sample content. In production, this would download the actual document from Firebase Storage.`
      );
    } catch (error) {
      console.error("Download error:", error);
      alert(`❌ Download failed: ${currentDocument.fileName}`);
    }
  };

  const renderDocumentContent = () => {
    const { category, fileName, uploadedBy } = currentDocument;
    const date = format(new Date(currentDocument.uploadDate), "MMMM dd, yyyy");

    switch (category) {
      case "resignation_letter":
        return (
          <div className="bg-white p-8 max-w-2xl mx-auto text-gray-800 leading-relaxed">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                LETTER OF RESIGNATION
              </h1>
              <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
            </div>

            <div className="mb-6">
              <p className="text-right text-gray-600">{date}</p>
            </div>

            <div className="mb-6">
              <p className="font-semibold">To: Human Resources Department</p>
              <p>Dragon Drop Organization</p>
            </div>

            <div className="mb-6">
              <p className="mb-4">Dear HR Team,</p>

              <p className="mb-4">
                I am writing to formally notify you of my resignation from my
                position as{" "}
                {employeeName && employeeName.includes("Alex")
                  ? "Sales Agent"
                  : "Team Member"}{" "}
                with Dragon Drop. My last day of work will be two weeks from
                today's date.
              </p>

              <p className="mb-4">
                I have greatly appreciated the opportunities for professional
                and personal growth during my time here. The experience has been
                invaluable, and I am grateful for the support provided by my
                colleagues and management.
              </p>

              <p className="mb-4">
                I am committed to ensuring a smooth transition of my
                responsibilities and will do everything possible to complete my
                current projects before my departure date.
              </p>

              <p className="mb-6">
                Thank you for your understanding and support.
              </p>

              <div className="mt-8">
                <p>Sincerely,</p>
                <div className="mt-6 border-b border-gray-400 w-48"></div>
                <p className="mt-2 font-semibold">{uploadedBy}</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
              📄 This is a mock document for demonstration purposes
            </div>
          </div>
        );

      case "termination_letter":
        return (
          <div className="bg-white p-8 max-w-2xl mx-auto text-gray-800 leading-relaxed">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-red-700 mb-2">
                NOTICE OF TERMINATION
              </h1>
              <div className="w-32 h-1 bg-red-600 mx-auto"></div>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Date:</strong> {date}
                </div>
                <div>
                  <strong>Employee:</strong> {employeeName || "Employee Name"}
                </div>
                <div>
                  <strong>Position:</strong>{" "}
                  {employeeName && employeeName.includes("Rachel")
                    ? "Team Lead"
                    : "Sales Agent"}
                </div>
                <div>
                  <strong>Employee ID:</strong> #
                  {Math.random().toString(36).substr(2, 8).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-4">
                This letter serves as formal notification that your employment
                with Dragon Drop is being terminated, effective {date}.
              </p>

              <p className="mb-4">
                <strong>Reason for Termination:</strong>{" "}
                {employeeName && employeeName.includes("Rachel")
                  ? "Performance standards not met despite improvement plan opportunities."
                  : "Violation of company policy regarding data handling procedures."}
              </p>

              <p className="mb-4">
                Please contact Human Resources at your earliest convenience to
                discuss:
              </p>

              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li>Final paycheck and accrued benefits</li>
                <li>Return of company property and equipment</li>
                <li>COBRA health insurance options</li>
                <li>Exit interview scheduling</li>
              </ul>

              <p className="mb-4">
                All company access will be terminated effective immediately.
                Please return your badge, laptop, and any other company
                materials to the HR department.
              </p>
            </div>

            <div className="mt-8">
              <p>Sincerely,</p>
              <div className="mt-6 border-b border-gray-400 w-48"></div>
              <p className="mt-2 font-semibold">{uploadedBy}</p>
              <p className="text-sm text-gray-600">Management</p>
            </div>

            <div className="mt-8 p-4 bg-red-50 border-l-4 border-red-400 text-sm text-red-800">
              📄 This is a mock document for demonstration purposes
            </div>
          </div>
        );

      case "exit_interview":
        return (
          <div className="bg-white p-8 max-w-2xl mx-auto text-gray-800 leading-relaxed">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-purple-700 mb-2">
                EXIT INTERVIEW SUMMARY
              </h1>
              <div className="w-32 h-1 bg-purple-600 mx-auto"></div>
            </div>

            <div className="mb-6 bg-purple-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Interview Date:</strong> {date}
                </div>
                <div>
                  <strong>Employee:</strong> {employeeName || "Employee Name"}
                </div>
                <div>
                  <strong>Interviewer:</strong> {uploadedBy}
                </div>
                <div>
                  <strong>Duration:</strong> 45 minutes
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-purple-700 mb-2">
                  Overall Experience
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  Employee expressed satisfaction with professional development
                  opportunities and team collaboration. Highlighted positive
                  relationships with colleagues and appreciated the company
                  culture.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-purple-700 mb-2">
                  Management Feedback
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  Positive feedback regarding direct supervisor support and
                  communication. Suggested more regular one-on-one meetings for
                  career development discussions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-purple-700 mb-2">
                  Suggestions for Improvement
                </h3>
                <ul className="list-disc ml-6 space-y-1 text-gray-700">
                  <li>Enhanced onboarding process for new hires</li>
                  <li>More cross-department collaboration opportunities</li>
                  <li>Additional training resources for skill development</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-purple-700 mb-2">
                  Reason for Leaving
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {employeeName && employeeName.includes("Alex")
                    ? "Pursuing advanced education - Masters degree program starting in the fall semester."
                    : "Career advancement opportunity with increased responsibilities in new organization."}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-purple-700 mb-2">
                  HR Recommendations
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  Employee eligible for rehire. Consider feedback for process
                  improvements. Maintain professional references for future
                  opportunities.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-600">
              <p>Interview conducted in accordance with company policy</p>
              <p>Confidential HR Document</p>
            </div>

            <div className="mt-8 p-4 bg-purple-50 border-l-4 border-purple-400 text-sm text-purple-800">
              📄 This is a mock document for demonstration purposes
            </div>
          </div>
        );

      case "equipment_return":
        return (
          <div className="bg-white p-8 max-w-2xl mx-auto text-gray-800 leading-relaxed">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-green-700 mb-2">
                EQUIPMENT RETURN RECEIPT
              </h1>
              <div className="w-32 h-1 bg-green-600 mx-auto"></div>
            </div>

            <div className="mb-6 bg-green-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Return Date:</strong> {date}
                </div>
                <div>
                  <strong>Employee:</strong> {employeeName || "Employee Name"}
                </div>
                <div>
                  <strong>Received By:</strong> {uploadedBy}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span className="text-green-600 font-semibold">Complete</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-green-700 mb-4">
                Items Returned:
              </h3>
              <div className="border border-gray-300 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b">Item</th>
                      <th className="text-left p-3 border-b">Asset Tag</th>
                      <th className="text-left p-3 border-b">Condition</th>
                      <th className="text-center p-3 border-b">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Laptop - Dell Latitude 5520</td>
                      <td className="p-3">
                        DDP-LAP-
                        {Math.random().toString(36).substr(2, 4).toUpperCase()}
                      </td>
                      <td className="p-3">Good</td>
                      <td className="p-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Monitor - Dell 24" Display</td>
                      <td className="p-3">
                        DDP-MON-
                        {Math.random().toString(36).substr(2, 4).toUpperCase()}
                      </td>
                      <td className="p-3">Excellent</td>
                      <td className="p-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Keyboard & Mouse</td>
                      <td className="p-3">
                        DDP-KBM-
                        {Math.random().toString(36).substr(2, 4).toUpperCase()}
                      </td>
                      <td className="p-3">Good</td>
                      <td className="p-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Employee Badge</td>
                      <td className="p-3">
                        EMP-
                        {Math.random().toString(36).substr(2, 6).toUpperCase()}
                      </td>
                      <td className="p-3">Good</td>
                      <td className="p-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="p-3">Desk Phone</td>
                      <td className="p-3">
                        DDP-PH-
                        {Math.random().toString(36).substr(2, 4).toUpperCase()}
                      </td>
                      <td className="p-3">Good</td>
                      <td className="p-3 text-center text-green-600">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                <strong>Notes:</strong> All equipment returned in satisfactory
                condition. No damage fees assessed. Employee access credentials
                have been deactivated.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <p className="text-sm text-gray-600">Employee Signature:</p>
                <div className="mt-2 border-b border-gray-400 pb-1">
                  <span className="italic text-gray-700">
                    {employeeName || "Employee Name"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Date: {date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IT Department:</p>
                <div className="mt-2 border-b border-gray-400 pb-1">
                  <span className="italic text-gray-700">{uploadedBy}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Date: {date}</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-green-50 border-l-4 border-green-400 text-sm text-green-800">
              📄 This is a mock document for demonstration purposes
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-8 max-w-2xl mx-auto text-gray-800 leading-relaxed">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-700 mb-2">
                {fileName.toUpperCase()}
              </h1>
              <div className="w-24 h-1 bg-gray-600 mx-auto"></div>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded">
              <p className="text-sm">
                <strong>Document Type:</strong>{" "}
                {getCategoryLabel(currentDocument.category)}
              </p>
              <p className="text-sm">
                <strong>Created:</strong> {date}
              </p>
              <p className="text-sm">
                <strong>Created By:</strong> {uploadedBy}
              </p>
            </div>

            <div className="space-y-4">
              <p>
                This document contains information related to employee records
                and HR processes.
              </p>
              <p>
                For questions regarding this document, please contact the Human
                Resources department.
              </p>
            </div>

            <div className="mt-8 p-4 bg-gray-50 border-l-4 border-gray-400 text-sm text-gray-700">
              📄 This is a mock document for demonstration purposes
            </div>
          </div>
        );
    }
  };

  const renderDocumentPreview = () => {
    const { fileType, fileName } = currentDocument;

    // For images (equipment receipts, signatures, etc.)
    if (fileType.includes("image")) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 overflow-auto">
          <div
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "center",
            }}
          >
            {currentDocument.category === "equipment_return" ? (
              renderDocumentContent()
            ) : (
              <img
                src={currentDocument.fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML =
                    renderDocumentContent() as any;
                }}
              />
            )}
          </div>
        </div>
      );
    }

    // For all document types - show realistic content
    return (
      <div className="h-full bg-gray-100 overflow-auto">
        <div
          className="min-h-full flex items-center justify-center p-4"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "top center",
          }}
        >
          {renderDocumentContent()}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 ${
        isFullscreen ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-xl flex flex-col ${
          isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-6xl h-5/6"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getDocumentTypeIcon(currentDocument.fileType)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentDocument.fileName}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                    currentDocument.category
                  )}`}
                >
                  {getCategoryLabel(currentDocument.category)}
                </span>
                <span>•</span>
                <span>
                  Uploaded{" "}
                  {format(new Date(currentDocument.uploadDate), "MMM dd, yyyy")}
                </span>
                {employeeName && (
                  <>
                    <span>•</span>
                    <span>{employeeName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Document navigation */}
            {documents.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentDocumentIndex + 1} of {documents.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                <div className="h-4 border-l border-gray-300 mx-2"></div>
              </>
            )}

            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
              disabled={zoomLevel <= 25}
            >
              <MagnifyingGlassMinusIcon className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
              disabled={zoomLevel >= 200}
            >
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </button>

            <div className="h-4 border-l border-gray-300 mx-2"></div>

            {/* Actions */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <EyeIcon className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document preview area */}
        <div className="flex-1 overflow-hidden">{renderDocumentPreview()}</div>

        {/* Footer with document info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                <strong>Uploaded by:</strong> {currentDocument.uploadedBy}
              </span>
              <span>
                <strong>File size:</strong> {currentDocument.fileType}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
              >
                Download
              </button>
              <button
                onClick={() => window.open(currentDocument.fileUrl, "_blank")}
                className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
