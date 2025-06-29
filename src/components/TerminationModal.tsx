import React, { useState, useRef } from "react";
import {
  Employee,
  TerminationReason,
  DocumentCategory,
  TerminationDocument,
  TerminationDetails,
} from "../types";
import { format } from "date-fns";
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface TerminationModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    employeeId: string,
    terminationDetails: TerminationDetails
  ) => void;
}

const terminationReasons = [
  { value: "voluntary_resignation", label: "Voluntary Resignation" },
  { value: "involuntary_termination", label: "Involuntary Termination" },
  { value: "performance_issues", label: "Performance Issues" },
  { value: "misconduct", label: "Misconduct" },
  { value: "layoff", label: "Layoff" },
  { value: "position_elimination", label: "Position Elimination" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "retirement", label: "Retirement" },
  { value: "other", label: "Other" },
];

const documentCategories = [
  { value: "termination_letter", label: "Termination Letter" },
  { value: "resignation_letter", label: "Resignation Letter" },
  { value: "final_pay_stub", label: "Final Pay Stub" },
  { value: "exit_interview", label: "Exit Interview" },
  { value: "equipment_return", label: "Equipment Return Form" },
  { value: "other", label: "Other" },
];

export const TerminationModal: React.FC<TerminationModalProps> = ({
  employee,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    terminationDate: Date.now(),
    lastWorkingDay: Date.now(),
    reason: "voluntary_resignation" as TerminationReason,
    notes: "",
    finalPayoutAmount: "",
    exitSurveyCompleted: false,
  });

  const [documents, setDocuments] = useState<TerminationDocument[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason) {
      newErrors.reason = "Termination reason is required";
    }

    if (!formData.notes.trim()) {
      newErrors.notes = "Termination notes are required";
    }

    if (
      formData.finalPayoutAmount &&
      isNaN(Number(formData.finalPayoutAmount))
    ) {
      newErrors.finalPayoutAmount = "Final payout must be a valid number";
    }

    if (formData.terminationDate > Date.now()) {
      newErrors.terminationDate = "Termination date cannot be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // In a real implementation, you'd upload to a storage service
      // For now, we'll simulate document storage
      const newDocument: TerminationDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name || "unknown_file",
        fileUrl: `mock://storage/${file.name || "unknown_file"}`, // Mock URL
        fileType: file.type || "application/octet-stream",
        uploadDate: Date.now(),
        uploadedBy: "Current User", // In real app, get from auth context
        category: "other", // Default category, user can change
      };

      setDocuments((prev) => [...prev, newDocument]);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDocumentCategoryChange = (
    docId: string,
    category: DocumentCategory
  ) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, category } : doc))
    );
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleSubmit = async () => {
    if (!employee || !validateForm()) return;

    setIsProcessing(true);

    try {
      // Create base termination details
      const terminationDetails: TerminationDetails = {
        terminationDate: formData.terminationDate,
        lastWorkingDay: formData.lastWorkingDay,
        reason: formData.reason,
        terminatedBy: "Current User", // In real app, get from auth context
        notes: formData.notes.trim(),
        documents,
        exitSurveyCompleted: formData.exitSurveyCompleted,
        date: new Date(formData.terminationDate).toISOString().split("T")[0],
        eligibleForRehire:
          formData.reason !== "misconduct" &&
          formData.reason !== "performance_issues",
        exitInterviewCompleted: formData.exitSurveyCompleted,
        equipmentReturned: true, // Default to true, can be made configurable
      };

      // Only include finalPayoutAmount if it has a valid value
      if (
        formData.finalPayoutAmount &&
        formData.finalPayoutAmount.trim() !== ""
      ) {
        terminationDetails.finalPayoutAmount = Number(
          formData.finalPayoutAmount
        );
      }

      // Debug: Log the termination details to ensure no undefined values
      console.log("🔍 Termination details being sent:", terminationDetails);

      // Validate that no values are undefined (including nested objects)
      const validateObject = (obj: any, path = ""): boolean => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (value === undefined) {
            console.error(`❌ Found undefined value at path: ${currentPath}`);
            return false;
          }

          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              if (typeof value[i] === "object" && value[i] !== null) {
                if (!validateObject(value[i], `${currentPath}[${i}]`)) {
                  return false;
                }
              } else if (value[i] === undefined) {
                console.error(
                  `❌ Found undefined value at path: ${currentPath}[${i}]`
                );
                return false;
              }
            }
          } else if (typeof value === "object" && value !== null) {
            if (!validateObject(value, currentPath)) {
              return false;
            }
          }
        }
        return true;
      };

      if (!validateObject(terminationDetails)) {
        console.error(
          "❌ Found undefined values in termination details:",
          terminationDetails
        );
        throw new Error("Invalid termination data: contains undefined values");
      }

      await onConfirm(employee.id, terminationDetails);
      onClose();

      // Reset form
      setFormData({
        terminationDate: Date.now(),
        lastWorkingDay: Date.now(),
        reason: "voluntary_resignation",
        notes: "",
        finalPayoutAmount: "",
        exitSurveyCompleted: false,
      });
      setDocuments([]);
      setErrors({});
    } catch (error) {
      console.error("Error processing termination:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-red-200 bg-red-50">
          <div>
            <h2 className="text-xl font-semibold text-red-900 flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
              Terminate Employee
            </h2>
            <p className="text-red-700 mt-1">
              Processing termination for <strong>{employee.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600"
            disabled={isProcessing}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Employee Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {employee.name}
              </div>
              <div>
                <span className="font-medium">Role:</span> {employee.role}
              </div>
              <div>
                <span className="font-medium">Site:</span> {employee.site}
              </div>
              <div>
                <span className="font-medium">Start Date:</span>{" "}
                {format(new Date(employee.startDate), "MMM dd, yyyy")}
              </div>
            </div>
          </div>

          {/* Termination Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Termination Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Termination Date *
              </label>
              <input
                type="date"
                value={format(new Date(formData.terminationDate), "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedDate = new Date(e.target.value + "T12:00:00");
                    setFormData({
                      ...formData,
                      terminationDate: selectedDate.getTime(),
                    });
                  }
                }}
                max={format(new Date(), "yyyy-MM-dd")}
                className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                  errors.terminationDate ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isProcessing}
              />
              {errors.terminationDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.terminationDate}
                </p>
              )}
            </div>

            {/* Last Working Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Last Working Day *
              </label>
              <input
                type="date"
                value={format(new Date(formData.lastWorkingDay), "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedDate = new Date(e.target.value + "T12:00:00");
                    setFormData({
                      ...formData,
                      lastWorkingDay: selectedDate.getTime(),
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Termination Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Termination Reason *
            </label>
            <select
              value={formData.reason}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reason: e.target.value as TerminationReason,
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                errors.reason ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isProcessing}
            >
              {terminationReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* Final Payout Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
              Final Payout Amount (optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.finalPayoutAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  finalPayoutAmount: e.target.value,
                })
              }
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                errors.finalPayoutAmount ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isProcessing}
            />
            {errors.finalPayoutAmount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.finalPayoutAmount}
              </p>
            )}
          </div>

          {/* Termination Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1" />
              Termination Notes *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              rows={4}
              placeholder="Provide detailed notes about the termination, including circumstances, performance issues, or other relevant information..."
              className={`w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 ${
                errors.notes ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isProcessing}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
            )}
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DocumentArrowUpIcon className="w-4 h-4 inline mr-1" />
              Supporting Documents
            </label>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                disabled={isProcessing}
              />

              <div className="text-center">
                <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  disabled={isProcessing}
                >
                  Click to upload documents
                </button>
                <p className="text-gray-500 text-sm mt-1">
                  PDF, DOC, DOCX, TXT, JPG, PNG files supported
                </p>
              </div>
            </div>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Uploaded Documents
                </h4>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Uploaded{" "}
                          {format(
                            new Date(doc.uploadDate),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={doc.category}
                        onChange={(e) =>
                          handleDocumentCategoryChange(
                            doc.id,
                            e.target.value as DocumentCategory
                          )
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                        disabled={isProcessing}
                      >
                        {documentCategories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={isProcessing}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exit Survey Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="exitSurvey"
              checked={formData.exitSurveyCompleted}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  exitSurveyCompleted: e.target.checked,
                })
              }
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              disabled={isProcessing}
            />
            <label htmlFor="exitSurvey" className="ml-2 text-sm text-gray-700">
              Exit survey has been completed
            </label>
          </div>

          {/* Warning Box */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-800 font-medium">Important Notice</h4>
                <p className="text-red-700 text-sm mt-1">
                  This action will immediately terminate the employee and remove
                  them from active duty. The employee record will be preserved
                  for audit and reference purposes. This action cannot be easily
                  undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Confirm Termination
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
