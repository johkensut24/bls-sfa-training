import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CertificatePage } from "./CertificatePage";

/**
 * Styles for the error/empty state page
 */
const errorStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333333",
  },
  message: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    maxWidth: 400,
  },
});

/**
 * EmptyStatePage Component
 * Renders when there are no valid certificates to display
 */
const EmptyStatePage = ({ message = "No certificates to display" }) => (
  <Page size="LETTER" style={errorStyles.page}>
    <View>
      <Text style={errorStyles.title}>⚠️ No Certificates Found</Text>
      <Text style={errorStyles.message}>{message}</Text>
    </View>
  </Page>
);

/**
 * Certificate Validation
 * Checks if a certificate object has the minimum required data
 */
const isValidCertificate = (cert) => {
  if (!cert || typeof cert !== "object") return false;

  const hasId = Boolean(cert._id || cert.id);
  const hasName = Boolean(cert.participant_name?.trim());

  return hasId && hasName;
};

/**
 * BatchCertPDF Component
 *
 * Generates a multi-page PDF document containing certificates for multiple participants.
 * Each certificate is rendered as a separate page in the document.
 *
 * Features:
 * - Validates certificate data before rendering
 * - Filters out invalid certificates with console warnings
 * - Provides metadata for the PDF document
 * - Renders empty state when no valid certificates exist
 * - Memoizes validation for performance
 *
 * @param {Object} props
 * @param {Array} props.certs - Array of certificate objects. Each must have:
 *   - _id or id: Unique identifier
 *   - participant_name: Participant's name
 *   - Other fields depend on CertificatePage requirements
 * @param {Object} [props.settings={}] - Optional settings object passed to each certificate page
 * @param {string} [props.documentTitle] - Custom document title (default: auto-generated)
 * @param {boolean} [props.showPageNumbers=false] - Whether to pass page numbers to certificates
 *
 * @returns {Document} React-PDF Document component
 *
 * @example
 * <BatchCertPDF
 *   certs={[
 *     { _id: '1', participant_name: 'John Doe', training_type: 'BLS' },
 *     { _id: '2', participant_name: 'Jane Smith', training_type: 'SFA' }
 *   ]}
 *   settings={{ off1_name: 'Dr. Smith', off1_pos: 'Director' }}
 * />
 */
export const BatchCertPDF = ({
  certs = [],
  settings = {},
  documentTitle,
  showPageNumbers = false,
}) => {
  // Validate and filter certificates
  const { validCerts, invalidCount } = React.useMemo(() => {
    // Input validation
    if (!Array.isArray(certs)) {
      console.error(
        "BatchCertPDF: certs prop must be an array. Received:",
        typeof certs,
      );
      return { validCerts: [], invalidCount: 0 };
    }

    if (certs.length === 0) {
      console.info("BatchCertPDF: No certificates provided");
      return { validCerts: [], invalidCount: 0 };
    }

    // Filter and validate
    const valid = [];
    let invalid = 0;

    certs.forEach((cert, index) => {
      if (isValidCertificate(cert)) {
        valid.push(cert);
      } else {
        invalid++;
        console.warn(`BatchCertPDF: Invalid certificate at index ${index}`, {
          hasId: Boolean(cert?._id || cert?.id),
          hasName: Boolean(cert?.participant_name?.trim()),
          data: cert,
        });
      }
    });

    if (invalid > 0) {
      console.warn(
        `BatchCertPDF: Filtered out ${invalid} invalid certificate(s). ` +
          `Rendering ${valid.length} valid certificate(s).`,
      );
    }

    return { validCerts: valid, invalidCount: invalid };
  }, [certs]);

  // Generate document title
  const docTitle = React.useMemo(() => {
    if (documentTitle) return documentTitle;

    if (validCerts.length === 0) {
      return "Empty Certificate Batch";
    }

    if (validCerts.length === 1) {
      return `Certificate - ${validCerts[0].participant_name}`;
    }

    return `Batch Certificates - ${validCerts.length} Participants`;
  }, [documentTitle, validCerts]);

  // Document metadata
  // Update your metadata useMemo
  const metadata = React.useMemo(
    () => ({
      title: docTitle,
      // Use the settings value if it exists, otherwise fallback
      author: settings?.off1_name || "Training Registry System",
      subject: "Training Certificates",
      keywords: "training, certificate, batch",
      creator: "Training Registry System",
      producer: "React-PDF",
    }),
    [docTitle, settings], // Add settings to the dependency array
  );

  // Render empty state if no valid certificates
  if (validCerts.length === 0) {
    const message =
      invalidCount > 0
        ? `All ${invalidCount} certificate(s) were invalid and could not be rendered. Please check your data.`
        : "No certificates were provided to generate.";

    return (
      <Document {...metadata}>
        <EmptyStatePage message={message} />
      </Document>
    );
  }

  // Render certificates
  return (
    <Document {...metadata}>
      {validCerts.map((cert, index) => {
        // Generate a stable key
        const key = cert._id || cert.id || `cert-${index}`;

        // Prepare props for CertificatePage
        const pageProps = {
          cert,
          settings,
        };

        // Optionally add page numbers
        if (showPageNumbers) {
          pageProps.pageNumber = index + 1;
          pageProps.totalPages = validCerts.length;
        }

        return (
          <CertificatePage
            key={key}
            signerName={settings?.off3_name}
            signerPosition={settings?.off3_pos}
            {...pageProps}
          />
        );
      })}
    </Document>
  );
};

// Display name for React DevTools
BatchCertPDF.displayName = "BatchCertPDF";

// Default export
export default BatchCertPDF;
