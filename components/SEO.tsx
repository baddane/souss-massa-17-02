import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'SoussMassa-RH';
const DEFAULT_DESCRIPTION = 'Trouvez votre emploi idéal dans la région Souss-Massa. Offres CDI, CDD, Stage à Agadir, Inezgane, Taroudant. Recrutement rapide et gratuit.';
const SITE_URL = 'https://soussmassa-rh.com';

const SEO: React.FC<SEOProps> = ({ title, description, canonical, type = 'website', image, jsonLd }) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Emploi et Recrutement Souss-Massa`;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = canonical ? `${SITE_URL}${canonical}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:locale" content="fr_MA" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

export function generateJobPostingJsonLd(offer: {
  emploi_metier: string;
  raison_sociale: string;
  ville: string;
  type_contrat: string;
  date_offre: string;
  full_description?: string;
  meta_description?: string;
  suggested_salary_range?: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `${offer.emploi_metier} - ${offer.ville}`,
    description: offer.full_description || offer.meta_description || offer.emploi_metier,
    datePosted: offer.date_offre,
    hiringOrganization: {
      '@type': 'Organization',
      name: offer.raison_sociale,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: offer.ville,
        addressRegion: 'Souss-Massa',
        addressCountry: 'MA',
      },
    },
    employmentType: mapContractType(offer.type_contrat),
    url: `${SITE_URL}/emploi/${offer.slug}`,
  };
}

function mapContractType(type: string): string {
  const map: Record<string, string> = {
    CDI: 'FULL_TIME',
    CDD: 'TEMPORARY',
    Stage: 'INTERN',
    Alternance: 'INTERN',
    Freelance: 'CONTRACTOR',
  };
  return map[type] || 'OTHER';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
