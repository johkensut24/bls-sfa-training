import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: { flexDirection: "row", backgroundColor: "#FFFFFF" },
  mainSection: {
    width: "71.5%",
    paddingTop: 15,
    paddingLeft: 20,
    paddingRight: 20,
    alignItems: "center",
    textAlign: "center",
  },
  sidebar: {
    width: "28.5%",
    backgroundColor: "#7FB77E",
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: -110,
    right: -110,
    bottom: -50,
    display: "flex",
    flexDirection: "column",
    gap: -65,
    zIndex: -1,
  },
  watermarkRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    height: 140,
  },
  staggeredRow: { transform: "translateX(-75px)" },
  watermarkLogo: {
    width: 130,
    height: 130,
    opacity: 0.06,
    borderRadius: 77.5,
    objectFit: "contain",
  },
  signatoryContent: {
    width: "100%",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  signatoryName: {
    fontSize: 13, // Slightly reduced to accommodate long names on one line
    fontWeight: "bold",
    borderTop: "1pt solid #000",
    paddingTop: 5,
    width: "95%", // Maximized horizontal room
    textAlign: "center",
  },
  signatoryTitle: {
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
  logoContainer: { flexDirection: "row", gap: 5, marginBottom: 8 },
  logo: { width: 90, height: 90, objectFit: "contain" },
  headerText: { fontSize: 9, color: "#000", marginBottom: 1 },
  centerTitle: {
    fontSize: 45,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  recipientName: {
    fontSize: 38,
    fontWeight: "bold",
    borderBottom: "2.5pt solid #000",
    marginTop: 10,
    marginBottom: 10,
    textTransform: "uppercase",
    paddingBottom: 2,
    textAlign: "center", // Ensures the border centers with the text
  },
  courseText: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 12,
    lineHeight: 1.2,
    paddingHorizontal: 25,
  },
  subText: {
    fontSize: 17,
    fontFamily: "Times-Italic",
    lineHeight: 1.4,
    paddingHorizontal: 70,
  },
  issuedText: {
    fontSize: 17,
    fontFamily: "Times-Italic",
    marginTop: 30,
  },
  footerCode: {
    position: "absolute",
    bottom: 20,
    left: 20,
    fontSize: 9,
    fontWeight: "bold",
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const toTitleCase = (str) => {
  if (!str) return "";
  const smallWords =
    /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v\.?|via)$/i;
  return str.replace(
    /[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g,
    (match, index, title) => {
      if (
        index > 0 &&
        index + match.length !== title.length &&
        match.search(smallWords) > -1
      ) {
        return match.toLowerCase();
      }
      return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    },
  );
};

const getTrainingAcronym = (text) => {
  const mapping = {
    "Basic Life Support Training": "BLS",
    "Basic Life Support and Standard First Aid Training": "BLS-SFA",
    "Basic Life Support Training of trainers": "BLS-TOT",
    "Standard First Aid Training of trainers": "SFA-TOT",
  };
  return mapping[text] || "TRNG";
};

const getParticipantAcronym = (text) => {
  const mapping = { "Lay Rescuer": "LR", "Healthcare Provider": "HCP" };
  return mapping[text] || "PART";
};

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const parseFinalDateComponents = (dateString) => {
  if (!dateString) return { year: "2026", month: "", day: 1 };

  // 1. Extract the year
  const yearMatch = dateString.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : "2026";

  // 2. Extract the month
  const monthMatch = dateString.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)/gi,
  );
  const month = monthMatch
    ? toTitleCase(monthMatch[monthMatch.length - 1])
    : "";

  // 3. Extract the last day in the string
  // This looks for all numbers and picks the last one that isn't the year
  const allNums = dateString.match(/\d+/g) || [];
  const days = allNums
    .map(Number)
    .filter((n) => n > 0 && n <= 31 && n !== parseInt(year));

  // We take the LAST number in the sequence (e.g., in "14-18", it takes 18)
  const day = days.length > 0 ? days[days.length - 1] : 1;

  return { year, month, day };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CertificatePage = ({ cert, signerName, signerPosition }) => {
  const dateString = cert?.training_date_range || cert?.training_date || "";
  const participantName = cert?.participant_name || "PARTICIPANT NAME";
  const trainingType = cert?.training_type || "Training Program";
  const venue = cert?.venue || "Training Venue";
  const facility = cert?.facility || "Training Facility";
  const participantType = cert?.participant_type || "Lay Rescuer";
  const certificateId = cert?._id || cert?.id || "000000";

  const formattedDateRange = toTitleCase(dateString);
  const { year, month, day } = parseFinalDateComponents(dateString);
  const certificateCode = `DOHCHD-1-${getTrainingAcronym(trainingType)}-${getParticipantAcronym(participantType)}-${year}-${certificateId}`;

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.mainSection}>
        <View style={styles.logoContainer}>
          <Image src="/doh-logo.png" style={styles.logo} />
          <Image src="/rescue-logo.png" style={styles.logo} />
          <Image src="/bagong-pilipinas-logo.png" style={styles.logo} />
        </View>

        <Text style={styles.headerText}>Republic of the Philippines</Text>
        <Text style={styles.headerText}>DEPARTMENT OF HEALTH</Text>
        <Text style={[styles.headerText, { fontWeight: "bold" }]}>
          ILOCOS CENTER FOR HEALTH DEVELOPMENT
        </Text>

        <Text style={{ fontSize: 12, marginTop: 15, fontWeight: "bold" }}>
          awards this
        </Text>
        <Text style={styles.centerTitle}>Certificate of Completion</Text>
        <Text style={{ fontSize: 12 }}>to</Text>

        <View style={{ alignItems: "center" }}>
          <Text
            style={[
              styles.recipientName,
              participantName.length >= 30
                ? { fontSize: 26 }
                : participantName.length >= 29
                  ? { fontSize: 28 }
                  : participantName.length >= 28
                    ? { fontSize: 30 }
                    : participantName.length >= 27
                      ? { fontSize: 32 }
                      : participantName.length >= 26
                        ? { fontSize: 34 }
                        : participantName.length >= 25
                          ? { fontSize: 36 }
                          : {},
            ]}
          >
            {participantName}
          </Text>
        </View>

        <Text style={styles.subText}>
          for having successfully completed the requirements of the
        </Text>
        <Text style={styles.courseText}>{trainingType}</Text>
        <Text style={styles.subText}>
          held from {formattedDateRange} at the {facility}, {venue}.
        </Text>

        <Text style={styles.issuedText}>
          Issued this {getOrdinal(day)} day of{" "}
          <Text style={{ fontWeight: "bold" }}>
            {month || "Month"} {year}
          </Text>{" "}
          in {venue}.
        </Text>

        <Text style={styles.footerCode}>{certificateCode}</Text>
      </View>

      <View style={styles.sidebar}>
        <View style={styles.watermarkContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`wm-${i}`}
              style={[
                styles.watermarkRow,
                i % 2 === 1 ? styles.staggeredRow : {},
              ]}
            >
              <Image src="/doh-logo-white.png" style={styles.watermarkLogo} />
              <Image src="/doh-logo-white.png" style={styles.watermarkLogo} />
              <Image src="/doh-logo-white.png" style={styles.watermarkLogo} />
            </View>
          ))}
        </View>

        <View style={styles.signatoryContent}>
          <Text
            style={[
              styles.signatoryName,
              signerName?.length > 80 ? { fontSize: 8 } : {},
            ]}
            break={false}
          >
            {signerName ? signerName.toUpperCase() : "REGIONAL OVERSIGHT"}
          </Text>
          <Text style={styles.signatoryTitle}>
            {signerPosition || "Director IV"}
          </Text>
        </View>
      </View>
    </Page>
  );
};

CertificatePage.displayName = "CertificatePage";
export default CertificatePage;
