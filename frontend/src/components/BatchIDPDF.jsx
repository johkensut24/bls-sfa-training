import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 15,
    paddingBottom: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 15,
  },
  idCardContainer: {
    width: 260,
    height: 165,
    border: "1.2pt solid #000",
    padding: 12,
    position: "relative",
    marginBottom: 10,
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
  },
  // FRONT STYLES
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  headerTextContainer: { alignItems: "center", flex: 1 },
  headerSmall: { fontSize: 7.5, textAlign: "center" },
  headerLarge: { fontSize: 8.5, fontWeight: "bold", textAlign: "center" },
  body: { flexDirection: "row", marginTop: 4 },
  photoSection: { width: 80, alignItems: "center" },
  photoBox: {
    width: 80,
    height: 90,
    border: "1pt solid #000",
    justifyContent: "center",
    alignItems: "center",
  },
  regNumFront: {
    fontSize: 8.5,
    fontWeight: "bold",
    marginTop: 6,
    textAlign: "left",
    width: "100%",
  },
  infoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: 10,
    paddingTop: 2,
  },
  certifyText: { fontSize: 8.5, marginBottom: 2, alignSelf: "flex-start" },
  nameText: {
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    width: "100%",
    lineHeight: 1.1,
    marginTop: 4,
    marginBottom: 4,
  },
  blsText: { fontSize: 8.5, marginTop: 2, marginBottom: 3 },
  orangeBadge: {
    backgroundColor: "#FF3B00",
    paddingVertical: 4,
    width: "100%",
  },
  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  // BACK STYLES
  backCardContainer: {
    width: 260,
    height: 165,
    padding: 12,
    paddingBottom: 0,
    position: "relative",
    marginBottom: 10,
    backgroundColor: "white",
  },
  backHeader: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  backLogo: { width: 42, height: 42, objectFit: "contain" },
  backRegInfo: {
    marginLeft: 10,
    flex: 1,
  },
  backRegRow: {
    fontSize: 7,
    marginBottom: 1,
    color: "#000",
    textAlign: "left",
  },
  backRegBold: { fontWeight: "bold" },
  signatureArea: {
    marginTop: 1,
    marginLeft: 52,
    alignItems: "center",
    width: "70%",
  },
  signatureLine: {
    borderTop: "1pt solid #000",
    width: "100%",
  },
  signatureLabel: {
    fontSize: 5.5,
    marginTop: 2,
    textAlign: "center",
  },
  officialsContainer: {
    position: "absolute",
    bottom: 5,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  officialBlock: {
    marginBottom: 15,
    alignItems: "center",
  },
  offName: {
    fontSize: 7,
    fontWeight: "bold",
  },
  offTitle: {
    fontSize: 6,
    textAlign: "center",
  },
  sigImageWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  sigImage: {
    width: 60,
    height: 35,
    objectFit: "contain",
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Process training date to extract registration and renewal dates
 * @param {string} dateStr - Training date string
 * @returns {Object} Object containing registered, renewal, and shortYear
 */
const processDates = (dateStr) => {
  if (!dateStr) {
    console.warn("BatchIDPDF: Missing training_date");
    return { registered: "N/A", renewal: "N/A", shortYear: "26" };
  }

  try {
    // Extract the end date if range exists
    let target = dateStr.includes("-") ? dateStr.split("-")[1].trim() : dateStr;

    // Add month name if missing
    if (!target.match(/[a-zA-Z]/)) {
      const monthMatch = dateStr.match(/^[a-zA-Z]+/);
      const month = monthMatch ? monthMatch[0] : "";
      target = `${month} ${target}`;
    }

    const dateObj = new Date(target);

    // Validate date
    if (isNaN(dateObj.getTime())) {
      console.warn(`BatchIDPDF: Invalid date format: ${dateStr}`);
      return { registered: "N/A", renewal: "N/A", shortYear: "26" };
    }

    const registered = dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Calculate renewal (2 years + 2 days)
    dateObj.setFullYear(dateObj.getFullYear() + 2);
    dateObj.setDate(dateObj.getDate() + 2);

    const renewal = dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const shortYear = registered.match(/\d{4}/)?.[0].slice(-2) || "26";

    return { registered, renewal, shortYear };
  } catch (err) {
    console.error("BatchIDPDF: Error processing date", err);
    return { registered: "N/A", renewal: "N/A", shortYear: "26" };
  }
};

/**
 * Calculate dynamic font size based on name length
 * @param {string} name - Participant name
 * @returns {number} Font size in points
 */
const getFontSize = (name) => {
  if (!name) return 11;
  const len = name.length;
  if (len > 35) return 6;
  if (len > 25) return 7.5;
  if (len > 20) return 9;
  return 11;
};

/**
 * Validate signature image data
 * @param {string} sig - Base64 signature data
 * @returns {boolean} True if valid signature
 */
const isValidSignature = (sig) => {
  return (
    sig &&
    typeof sig === "string" &&
    sig.startsWith("data:image/png;base64") &&
    sig.length > 1000
  );
};

/**
 * Generate registration number based on participant type
 * @param {Object} person - Participant data
 * @param {string} shortYear - Two-digit year
 * @returns {string} Registration number
 */
const generateRegNo = (person, shortYear) => {
  const participantId = String(person._id || person.id || "000");
  const isHCP = person.participant_type?.toLowerCase().includes("healthcare");
  const prefix = isHCP ? "BLSHCP" : "BLSLR";
  return `${prefix}-${shortYear}-DOHROI-${participantId}`;
};

/**
 * Validate participant data
 * @param {Object} person - Participant data
 * @returns {Object} Validation result
 */
const validateParticipant = (person) => {
  const errors = [];

  if (!person) {
    return {
      isValid: false,
      errors: ["Participant data is null or undefined"],
    };
  }

  if (!person._id && !person.id) {
    errors.push("Missing ID");
  }

  if (!person.participant_name?.trim()) {
    errors.push("Missing participant name");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * BatchIDPDF Component
 *
 * Generates a PDF document containing ID cards for multiple participants.
 * Creates two pages: one with front sides, one with back sides.
 *
 * @param {Object} props
 * @param {Array} props.certs - Array of participant/certificate objects
 * @param {Object} props.settings - Settings object containing signatory information
 * @returns {Document} React-PDF Document component
 */
export const BatchIDPDF = ({ certs = [], settings = {} }) => {
  // 1. Filter and Validate
  const validCerts = React.useMemo(() => {
    return certs.filter((cert) => validateParticipant(cert).isValid);
  }, [certs]);

  // 2. Helper to split array into chunks of 8
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  if (validCerts.length === 0) return null;

  const participantChunks = chunkArray(validCerts, 8);

  return (
    <Document title="Batch ID Cards" author="DOH-HEMS">
      {/* FRONT PAGES */}
      {participantChunks.map((chunk, pageIndex) => (
        <Page key={`front-page-${pageIndex}`} size="A4" style={styles.page}>
          {chunk.map((person, index) => {
            const { shortYear } = processDates(person.training_date);
            const regNo = generateRegNo(person, shortYear);
            return (
              <View
                key={`front-${person._id || index}`}
                style={styles.idCardContainer}
              >
                {/* ... Front Card Content (Same as your original code) ... */}
                <View style={styles.header}>
                  <Image src="/doh-logo.png" style={styles.logo} />
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerSmall}>
                      Republic of the Philippines
                    </Text>
                    <Text style={styles.headerLarge}>DEPARTMENT OF HEALTH</Text>
                    <Text style={styles.headerSmall}>
                      Health Emergency Management Staff
                    </Text>
                  </View>
                  <Image src="/rescue-logo.png" style={styles.logo} />
                </View>
                <View style={styles.body}>
                  <View style={styles.photoSection}>
                    <View style={styles.photoBox}>
                      <Text style={{ fontSize: 8 }}>PICTURE</Text>
                    </View>
                    <Text style={styles.regNumFront}>{regNo}</Text>
                  </View>
                  <View style={styles.infoArea}>
                    <Text style={styles.certifyText}>This certifies that:</Text>
                    <Text
                      style={[
                        styles.nameText,
                        { fontSize: getFontSize(person.participant_name) },
                      ]}
                    >
                      {person.participant_name || "PARTICIPANT NAME"}
                    </Text>
                    <Text style={styles.blsText}>
                      is a DOH-HEMS Basic Life Support
                    </Text>
                    <View style={styles.orangeBadge}>
                      <Text style={styles.badgeText}>
                        {person.participant_type?.toUpperCase() ||
                          "LAY RESCUER"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Page>
      ))}

      {/* BACK PAGES */}
      {participantChunks.map((chunk, pageIndex) => (
        <Page key={`back-page-${pageIndex}`} size="A4" style={styles.page}>
          {chunk.map((person, index) => {
            const { registered, renewal, shortYear } = processDates(
              person.training_date,
            );
            const regNo = generateRegNo(person, shortYear);
            return (
              <View
                key={`back-${person._id || index}`}
                style={styles.backCardContainer}
              >
                {/* ... Back Card Content (Same as your original code) ... */}
                <View style={styles.backHeader}>
                  <Image src="/rescue-logo.png" style={styles.backLogo} />
                  <View style={styles.backRegInfo}>
                    <Text style={styles.backRegRow}>
                      Registration No.:{" "}
                      <Text style={styles.backRegBold}>{regNo}</Text>
                    </Text>
                    <Text style={styles.backRegRow}>
                      Date Registered: {registered}
                    </Text>
                    <Text style={styles.backRegRow}>
                      Date Renewal: {renewal}
                    </Text>
                  </View>
                </View>
                <View style={styles.signatureArea}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>
                    Cardholder's Signature
                  </Text>
                </View>
                <View style={styles.officialsContainer}>
                  {/* Signature Overlay logic here ... */}
                  <View style={styles.officialBlock}>
                    {isValidSignature(settings?.off1_sig) && (
                      <View style={styles.sigImageWrapper}>
                        <Image
                          src={settings.off1_sig}
                          style={styles.sigImage}
                        />
                      </View>
                    )}
                    <Text style={styles.offName}>{settings?.off1_name}</Text>
                    <Text style={styles.offTitle}>{settings?.off1_pos}</Text>
                  </View>
                  <View style={styles.officialBlock}>
                    <Text style={styles.offName}>{settings?.off2_name}</Text>
                    <Text style={styles.offTitle}>{settings?.off2_pos}</Text>
                  </View>
                  <View style={[styles.officialBlock, { marginBottom: 0 }]}>
                    <Text style={styles.offName}>{settings?.off3_name}</Text>
                    <Text style={styles.offTitle}>{settings?.off3_pos}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
};

// Display name for debugging
BatchIDPDF.displayName = "BatchIDPDF";

export default BatchIDPDF;
