/**
 * Dough N Cheese — Generic Google Maps Resolver & Embed Builder
 *
 * Provides a universal, branch-agnostic location resolver that supports:
 * - Direct Google Maps embed URLs
 * - Google Maps place & search URLs
 * - Latitude / longitude coordinate extraction (@lat,lng, !3dlat!4dlng, q=lat,lng)
 * - Raw iframe paste extraction (<iframe src="...">)
 * - Shortened share links (maps.app.goo.gl)
 * - Dynamic branch address + name query generation
 * - Graceful fallback handling
 */

export type MapResolutionResult = {
  /** The final URL to pass to the <iframe> src, or null if no location can be derived */
  embedUrl: string | null;
  /** The direct Google Maps link for the "Get Directions" button */
  directionsUrl: string;
  /** Whether a valid embed URL was successfully resolved */
  hasEmbed: boolean;
  /** The resolution strategy used */
  source: 'direct_embed' | 'coordinates' | 'query_param' | 'place_slug' | 'address_fallback' | 'none';
};

export type BranchLocationInput = {
  name?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
};

/**
 * Sanitize a user-provided maps URL (handles whitespace, accidental iframe tags, etc.)
 */
export function sanitizeMapsInput(urlStr?: string | null): string {
  if (!urlStr || !urlStr.trim()) return '';
  let cleaned = urlStr.trim();

  // If administrator pasted an entire <iframe src="..." /> HTML snippet
  const iframeSrcMatch = cleaned.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleaned = iframeSrcMatch[1].trim();
  }

  return cleaned;
}

/**
 * Safely extract latitude and longitude coordinates from various Google Maps URL formats.
 */
export function extractCoordinates(url: string): { lat: string; lng: string } | null {
  if (!url) return null;

  // 1. Check for standard @lat,lng e.g. /@31.520378,74.358747
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: atMatch[1], lng: atMatch[2] };
  }

  // 2. Check for Google Maps Protobuf/Place data: !3d31.520378!4d74.358747
  const placeDataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (placeDataMatch) {
    return { lat: placeDataMatch[1], lng: placeDataMatch[2] };
  }

  // 3. Check for query/param coordinates e.g. query=31.52,74.35 or q=31.52,74.35 or ll=31.52,74.35
  const paramMatch = url.match(/(?:query|q|ll|center|loc:)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
  if (paramMatch) {
    return { lat: paramMatch[1], lng: paramMatch[2] };
  }

  return null;
}

/**
 * Generic Google Maps resolver for any branch.
 */
export function resolveGoogleMapsUrl(input: BranchLocationInput): MapResolutionResult {
  const name = (input.name || '').trim();
  const address = (input.address || '').trim();
  const rawUrl = sanitizeMapsInput(input.mapsUrl);

  // Default fallback directions URL
  const defaultDirectionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Dough N Cheese ${name} ${address}`.trim())}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Dough N Cheese ${name}`.trim())}`;

  const directionsUrl = rawUrl || defaultDirectionsUrl;

  // =========================================================================
  // PRIORITY 1: Direct Google Maps Embed URL
  // =========================================================================
  if (rawUrl && (rawUrl.includes('output=embed') || rawUrl.includes('/maps/embed') || rawUrl.includes('google.com/maps/embed/v1'))) {
    return {
      embedUrl: rawUrl,
      directionsUrl,
      hasEmbed: true,
      source: 'direct_embed',
    };
  }

  // =========================================================================
  // PRIORITY 2: Safely extract coordinates from Google Maps URL
  // =========================================================================
  if (rawUrl) {
    const coords = extractCoordinates(rawUrl);
    if (coords) {
      const embedUrl = `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      return {
        embedUrl,
        directionsUrl,
        hasEmbed: true,
        source: 'coordinates',
      };
    }
  }

  // =========================================================================
  // PRIORITY 3: Extract search query parameter from URL (e.g. query=... or q=...)
  // =========================================================================
  if (rawUrl) {
    try {
      // Parse query param if standard URL
      const urlObj = new URL(rawUrl);
      const queryParam = urlObj.searchParams.get('query') || urlObj.searchParams.get('q');
      if (queryParam && queryParam.trim()) {
        const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(queryParam.trim())}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        return {
          embedUrl,
          directionsUrl,
          hasEmbed: true,
          source: 'query_param',
        };
      }

      // Check place path slug e.g. /maps/place/Dough+N+Cheese+Lahore/
      const placeMatch = rawUrl.match(/\/maps\/place\/([^/@?]+)/i);
      if (placeMatch && placeMatch[1]) {
        const decodedPlace = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
        if (decodedPlace) {
          const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(decodedPlace)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
          return {
            embedUrl,
            directionsUrl,
            hasEmbed: true,
            source: 'place_slug',
          };
        }
      }
    } catch {
      // If URL parsing fails (e.g. relative or partial URL), proceed to Priority 4
    }
  }

  // =========================================================================
  // PRIORITY 4: Construct search embed location using branch name + address
  // =========================================================================
  if (address || name) {
    const query = [
      'Dough N Cheese',
      name,
      address,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    return {
      embedUrl,
      directionsUrl,
      hasEmbed: true,
      source: 'address_fallback',
    };
  }

  // =========================================================================
  // PRIORITY 5: No usable location data found
  // =========================================================================
  return {
    embedUrl: null,
    directionsUrl: rawUrl || 'https://www.google.com/maps',
    hasEmbed: false,
    source: 'none',
  };
}

/**
 * Convenience helper to get the iframe embed URL for a branch.
 */
export function buildBranchMapEmbedUrl(branch: BranchLocationInput): string | null {
  return resolveGoogleMapsUrl(branch).embedUrl;
}

/**
 * Convenience helper to get the "Get Directions" link for a branch.
 */
export function buildBranchDirectionsUrl(branch: BranchLocationInput): string {
  return resolveGoogleMapsUrl(branch).directionsUrl;
}
