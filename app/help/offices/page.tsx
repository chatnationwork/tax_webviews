'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ExternalLink,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import { Button, Card, Layout } from '@/app/_components/Layout';
import { KRA_OFFICES, KRAOffice } from '@/data/kra-offices';

const REGIONS = [
  'All Regions',
  'Nairobi',
  'Central',
  'Eastern',
  'North Eastern',
  'Coast',
  'Western',
  'Nyanza',
  'Rift Valley',
  'North Rift',
] as const;

function getRegionClasses(region: string): string {
  switch (region) {
    case 'Nairobi':
      return 'bg-blue-50 text-blue-700';
    case 'Central':
      return 'bg-indigo-50 text-indigo-700';
    case 'Eastern':
      return 'bg-cyan-50 text-cyan-700';
    case 'North Eastern':
      return 'bg-teal-50 text-teal-700';
    case 'Coast':
      return 'bg-sky-50 text-sky-700';
    case 'Western':
      return 'bg-green-50 text-green-700';
    case 'Nyanza':
      return 'bg-emerald-50 text-emerald-700';
    case 'Rift Valley':
      return 'bg-orange-50 text-orange-700';
    case 'North Rift':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function useOfficeSearch(offices: KRAOffice[]) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('All Regions');

  const filteredOffices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offices.filter((office) => {
      const matchesQuery =
        q.length === 0 ||
        office.name.toLowerCase().includes(q) ||
        office.location.toLowerCase().includes(q);
      const matchesRegion = region === 'All Regions' || office.region === region;
      return matchesQuery && matchesRegion;
    });
  }, [offices, query, region]);

  const transitionKey = `${query}::${region}::${filteredOffices.length}`;

  const clearFilters = () => {
    setQuery('');
    setRegion('All Regions');
  };

  return {
    query,
    setQuery,
    region,
    setRegion,
    filteredOffices,
    transitionKey,
    clearFilters,
  };
}

type OfficeCardProps = {
  office: KRAOffice;
};

export function OfficeCard({ office }: OfficeCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.mapsQuery)}`;

  const openDirections = () => {
    window.open(mapsUrl, '_blank');
  };

  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm p-3">
      <div className="space-y-2.5">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-gray-900">{office.name}</h3>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">{office.address}</p>
          </div>
          <span
            className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${getRegionClasses(
              office.region
            )}`}
          >
            {office.region}
          </span>
        </div>

        {office.phone ? (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={openDirections} variant="secondary" className="text-xs py-2">
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Get Directions
              </span>
            </Button>
            <a
              href={`tel:${office.phone}`}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-center bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)]"
            >
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                Call Office
              </span>
            </a>
          </div>
        ) : (
          <Button onClick={openDirections} variant="secondary" className="text-xs py-2">
            <span className="inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Get Directions
            </span>
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function OfficesPage() {
  const router = useRouter();
  const { query, setQuery, region, setRegion, filteredOffices, transitionKey, clearFilters } =
    useOfficeSearch(KRA_OFFICES);

  return (
    <Layout title="KRA Offices" showHeader={false}>
      <header className="sticky top-0 z-10 bg-[#CC0000] text-white">
        <div className="max-w-md mx-auto px-3 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-md hover:bg-red-700"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold pr-6">KRA Offices</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by office name or town..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {REGIONS.map((regionItem) => {
            const isActive = regionItem === region;
            return (
              <button
                key={regionItem}
                onClick={() => setRegion(regionItem)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  isActive
                    ? 'bg-[#CC0000] text-white border-[#CC0000]'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {regionItem}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500">Showing {filteredOffices.length} offices</p>

        <section className="pb-3">
          {filteredOffices.length > 0 ? (
            <div key={transitionKey} className="space-y-2.5 offices-fade-in">
              {filteredOffices.map((office) => (
                <OfficeCard key={office.id} office={office} />
              ))}
            </div>
          ) : (
            <Card className="rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="flex justify-center mb-2">
                <MapPin className="w-7 h-7 text-gray-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">No offices found</h2>
              <p className="text-xs text-gray-500 mt-1">Try a different search or region</p>
              <div className="mt-3">
                <Button onClick={clearFilters} variant="secondary">
                  Clear filters
                </Button>
              </div>
            </Card>
          )}
        </section>
      </main>

      <style jsx>{`
        .offices-fade-in {
          animation: officesFadeIn 220ms ease-out;
        }

        @keyframes officesFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  );
}
