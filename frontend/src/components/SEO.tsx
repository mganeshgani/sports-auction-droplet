import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  noIndex?: boolean;
}

const SEO: React.FC<SEOProps> = ({
  title = 'BidSport — Sports Auction Software | Online Player Auction India',
  description = "India's best online player auction software for cricket, football, kabaddi & volleyball tournaments. Conduct live IPL-style auctions with real-time bidding. Free trial available.",
  keywords = 'sports auction software, player auction software, cricket auction, online player auction India',
  url = 'https://sportsauction.me',
  image = 'https://sportsauction.me/og-image.png',
  noIndex = false,
}) => {
  return (
    <Helmet>
      {/* Title */}
      <title>{title}</title>
      <meta name="title" content={title} />

      {/* Basic SEO */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
