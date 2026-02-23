import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CertificatePage } from "./CertificatePage";

/**
 * Styles for error/empty state page
 */
const errorStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    maxWidth: 500,
    padding: 30,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    border: "2 solid #dc2626",
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#dc2626",
    textAlign: "center",
  },
  message: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 1.6,
    marginBottom: 16,
  },
  details: {
    fontSize: 10,
    color: "#9ca3af",
    fontFamily: "Courier",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 4,
  },
  footer: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});

/**
 * ErrorPage Component
 * Displays when certificate data is invalid or missing
 */
const ErrorPage = ({ error, details }) => (
  <Page size="LETTER" style={errorStyles.page}>
    <View style={errorStyles.container}>
      <Text style={errorStyles.icon}>⚠️</Text>
      <Text style={errorStyles.title}>Certificate Generation Failed</Text>
      <Text style={errorStyles.message}>{error}</Text>
      {details && <Text style={errorStyles.details}>{details}</Text>}
      <Text style={errorStyles.footer}>
        Please verify the certificate data and try again.
      </Text>
    </View>
  </Page>
);

/**
 * Certificate data validation
 * @param {Object} data - Certificate data to validate
 * @returns {Object} Validation result
 */
const validateCertificateData = (data) => {
  // 1. Check if data exists
  if (!data) {
    return {
      isValid: false,
      error: "No certificate data provided",
      details:
        "The data prop is undefined or null. Please ensure you are passing certificate data to the component.",
      code: "NO_DATA",
    };
  }

  // 2. Check if data is an object
  if (typeof data !== "object" || Array.isArray(data)) {
    return {
      isValid: false,
      error: "Invalid data format",
      details: `Expected an object, but received: ${Array.isArray(data) ? "array" : typeof data}`,
      code: "INVALID_TYPE",
    };
  }

  // 3. Check for required ID field
  const hasId = Boolean(data._id || data.id);
  if (!hasId) {
    return {
      isValid: false,
      error: "Missing required field: ID",
      details: 'Certificate data must include either an "_id" or "id" field.',
      code: "MISSING_ID",
    };
  }

  // 4. Check for required participant name
  const participantName = data.participant_name?.trim();
  if (!participantName) {
    return {
      isValid: false,
      error: "Missing required field: Participant Name",
      details:
        'Certificate data must include a non-empty "participant_name" field.',
      code: "MISSING_NAME",
    };
  }

  // 5. Warn about missing optional but recommended fields
  const warnings = [];

  if (!data.training_type) {
    warnings.push("training_type");
  }
  if (!data.training_date) {
    warnings.push("training_date");
  }
  if (!data.venue) {
    warnings.push("venue");
  }

  if (warnings.length > 0) {
    console.warn(
      `CertPDF: Certificate for "${participantName}" is missing optional fields:`,
      warnings.join(", "),
    );
  }

  // All required validations passed
  return {
    isValid: true,
    error: null,
    details: null,
    code: "VALID",
    warnings,
  };
};

/**
 * CertPDF Component
 *
 * Generates a single-page PDF certificate document for an individual participant.
 *
 * This component provides robust validation, error handling, and metadata support
 * for generating professional training certificates.
 *
 * Features:
 * - Comprehensive data validation with detailed error messages
 * - Graceful error handling with informative error pages
 * - Professional PDF metadata (title, author, subject, etc.)
 * - Warning logs for missing optional fields
 * - Memoized validation for performance
 * - TypeScript-ready with clear prop documentation
 *
 * Required Certificate Data Fields:
 * - _id or id: Unique identifier for the certificate
 * - participant_name: Full name of the participant (non-empty string)
 *
 * Recommended Optional Fields:
 * - training_type: Type of training completed
 * - training_date: Date(s) of the training
 * - venue: Location where training took place
 * - facility: Organization or facility name
 * - position: Participant's job position
 * - age: Participant's age
 * - participant_type: Type of participant (e.g., "Healthcare Provider")
 *
 * @param {Object} props
 * @param {Object} props.data - Certificate data object (see required fields above)
 * @param {Object} [props.settings] - Optional settings object passed to CertificatePage
 * @param {string} [props.documentTitle] - Optional custom document title (auto-generated from participant name if not provided)
 * @param {boolean} [props.showWarnings=true] - Whether to log warnings for missing optional fields
 *
 * @returns {Document} React-PDF Document component
 *
 * @example
 * // Basic usage
 * <CertPDF
 *   data={{
 *     _id: '12345',
 *     participant_name: 'John Doe',
 *     training_type: 'Basic Life Support',
 *     training_date: 'January 15-17, 2026',
 *     venue: 'Training Center',
 *     facility: 'City Hospital'
 *   }}
 * />
 *
 * @example
 * // With settings
 * <CertPDF
 *   data={certificateData}
 *   settings={{
 *     off1_name: 'Dr. Sarah Johnson',
 *     off1_pos: 'Training Director'
 *   }}
 *   documentTitle="Professional Certificate"
 * />
 *
 * @example
 * // In a download link
 * <PDFDownloadLink
 *   document={<CertPDF data={certificateData} />}
 *   fileName={`${certificateData.participant_name}_Certificate.pdf`}
 * >
 *   Download Certificate
 * </PDFDownloadLink>
 */
export const CertPDF = ({
  data,
  settings,
  documentTitle,
  showWarnings = true,
}) => {
  // Validate certificate data with memoization
  const validation = React.useMemo(() => {
    const result = validateCertificateData(data);

    // Log errors to console for debugging
    if (!result.isValid) {
      console.error("CertPDF: Certificate validation failed", {
        errorCode: result.code,
        error: result.error,
        details: result.details,
        receivedData: data,
      });
    } else if (showWarnings && result.warnings?.length > 0) {
      // Warnings already logged in validation function
    }

    return result;
  }, [data, showWarnings]);

  // Generate document title with memoization
  const docTitle = React.useMemo(() => {
    if (documentTitle) {
      return documentTitle;
    }

    if (validation.isValid && data.participant_name) {
      const name = data.participant_name.trim();
      return `Training Certificate - ${name}`;
    }

    return "Training Certificate";
  }, [documentTitle, validation.isValid, data?.participant_name]);

  // Generate comprehensive document metadata
  const metadata = React.useMemo(() => {
    return {
      title: docTitle,
      author: settings?.off1_name || "Training Registry System", // Use the primary officer's name as author
      subject: data?.training_type || "Training Certificate",
      creator: "Training Registry System",
      producer: "React-PDF",
      keywords: `training, certificate, ${data?.training_type || ""}`,
    };
  }, [docTitle, validation.isValid, data?.training_type, settings]);

  // Render error page if validation failed
  if (!validation.isValid) {
    return (
      <Document {...metadata}>
        <ErrorPage error={validation.error} details={validation.details} />
      </Document>
    );
  }

  // Render certificate page
  return (
    <Document {...metadata}>
      <CertificatePage
        cert={data}
        settings={settings || {}}
        signerName={settings?.off3_name}
        signerPosition={settings?.off3_pos}
      />
    </Document>
  );
};

// Display name for React DevTools
CertPDF.displayName = "CertPDF";

// Default export
export default CertPDF;
