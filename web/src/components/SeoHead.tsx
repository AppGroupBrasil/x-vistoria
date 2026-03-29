import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  noindex?: boolean;
}

export default function SeoHead({ title, description, url, image, noindex }: Readonly<SeoHeadProps>) {
  const fullTitle = title.includes('X Vistoria') ? title : `${title} — X Vistoria`;
  const defaultDesc = 'Sistema completo de vistoria condominial com checklists, relatórios PDF, fotos geolocalizadas e gestão de pendências.';
  const desc = description ?? defaultDesc;
  const ogImage = image ?? 'https://xvistoria.com.br/og-image.png';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {url && <link rel="canonical" href={url} />}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="X Vistoria" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
