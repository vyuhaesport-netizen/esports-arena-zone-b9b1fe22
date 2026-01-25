import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event' | 'profile';
  noIndex?: boolean;
  jsonLd?: object;
}

const defaultMeta = {
  title: "Vyuha Esport | India's #1 BGMI & Free Fire Tournament Platform",
  description: "Join Vyuha Esport - India's premier esports tournament platform founded by Abhishek Shukla. Compete in BGMI, Free Fire, COD Mobile tournaments. Win real cash prizes up to ₹1 Lakh!",
  keywords: "BGMI tournament, Free Fire tournament India, esports India, gaming tournaments, BGMI competition, Free Fire contest, COD Mobile tournament, online gaming India, esports platform, Vyuha Esport, Abhishek Shukla, vyuhaesport",
  image: "https://vyuhaesport.in/favicon.png",
  url: "https://vyuhaesport.in",
};

const SEOHead = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noIndex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title 
    ? `${title} | Vyuha Esport` 
    : defaultMeta.title;
  const metaDescription = description || defaultMeta.description;
  const metaKeywords = keywords || defaultMeta.keywords;
  const metaImage = image || defaultMeta.image;
  const canonicalUrl = url || defaultMeta.url;

  // Default WebPage JSON-LD
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": fullTitle,
    "description": metaDescription,
    "url": canonicalUrl,
    "isPartOf": {
      "@id": "https://vyuhaesport.in/#website"
    },
    "about": {
      "@id": "https://vyuhaesport.in/#organization"
    },
    "inLanguage": "en-IN"
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      <meta name="googlebot" content="index, follow" />
      
      {/* Canonical URL - Critical for avoiding duplicate content */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="Vyuha Esport" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:site" content="@VyuhaEsport" />
      
      {/* Additional SEO */}
      <meta name="author" content="Abhishek Shukla" />
      <meta name="publisher" content="Vyuha Esport" />
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
