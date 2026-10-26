import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { FAQ_KEYS } from "./faq";

/** JSON-LD describing the site, the application and the FAQ, for rich results. */
export async function StructuredData() {
  const [tm, tf] = await Promise.all([getTranslations("metadata"), getTranslations("landing.faq")]);

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: tm("description"),
        inLanguage: "fr-FR",
      },
      {
        "@type": "WebApplication",
        "@id": `${siteConfig.url}/#app`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: tm("description"),
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_KEYS.map((key) => ({
          "@type": "Question",
          name: tf(`items.${key}.question`),
          acceptedAnswer: { "@type": "Answer", text: tf(`items.${key}.answer`) },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Escaping "<" keeps the payload from closing the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
