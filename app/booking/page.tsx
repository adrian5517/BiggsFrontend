"use client";
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import SampleBookingForm from './sample-booking';
import { FaStore, FaClock, FaPhone } from 'react-icons/fa';

interface Branch {
  id: number;
  title: string;
  description: string;
  contact: string;
  image: string;
}

const BookingPage = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For demo/mock: Replace with your actual API call if needed
    setBranches([

  { id: 14,   title: 'BIGGS GOA',         description: '7:00AM - 8:00PM | With Function Hall | San Jose St., Goa, Camarines Sur',                                           contact: '0928-664-4114', image: '66cfc35ea11a53.96310693.png'  },
  { id: 15,   title: 'BIGGS IRIGA',        description: '8:00AM - 9:00PM | With FoodPanda & Function Hall | San Roque, Iriga City',                                          contact: '0907-904-1992', image: '66cfc377c70269.53103733.png'  },
  { id: 17,   title: 'BIGGS SM NAGA',      description: '10:00AM - 9:00PM | SM City Naga Triangulo 4400, Naga City, Camarines Sur',                                         contact: '0994-230-9660', image: '66cfc38323d474.17095477.png'  },
  { id: 27,   title: 'BIGGS BIA',          description: '4:00AM - 7:00PM | With FoodPanda | Bicol International Airport, Abolo, Daraga Albay',                              contact: '0935-110-1728', image: '66cfc38d5b1b80.27307739.png'  },
  { id: 28,   title: 'BIGGS CAMALIG',      description: '24HRS | With FoodPanda & Function Hall | Bypass Road P1 Ilawod Camalig Albay',                                     contact: '0917-143-0122', image: '66cfc39916bc82.93169621.png'  },
  { id: 29,   title: 'BIGGS SM SORSOGON',  description: '8:00AM - 11:00PM | With FoodPanda | 187-188 G/F SM City Sorsogon, Maharlika Highway, Balogo Sorsogon City',        contact: '0995-192-1944', image: '66cfc3a3def788.38085444.png'  },
  { id: 31,   title: 'BIGGS ROBINSON',     description: '10:00AM - 9:00PM | G/F, Robinsons Place Naga, Roxas Avenue',                                                      contact: '0995-842-4394', image: '66cfc3bbad9b67.52558676.png'  },
  { id: 33,   title: 'BIGGS EMERALD',      description: '9AM - 9PM | With FoodPanda & Function Hall | Grand Emerald Plaza, San Felipe, Naga City',                          contact: '0992-961-9982', image: '66cfc3c67b5e40.59990367.png'  },
  { id: 34,   title: 'BIGGS CENTRO NAGA',  description: '24HRS | With FoodPanda & Function Hall | Elias Angeles St., Naga City',                                            contact: '0956-934-0799', image: '66cfc3d889cd52.61111850.png'  },
  { id: 35,   title: 'BIGGS PILI',         description: '24HRS | With FoodPanda & Function Hall | National Highway, Brgy. San Agustin, Pili, Camarines Sur',                contact: '0917-172-4447', image: '66cfc3e3c61d31.17410180.png'  },
  { id: 36,   title: 'BIGGS PACIFIC MALL', description: '10:00AM - 8:00PM | With FoodPanda & Function Hall | G/F, Pacific Mall, Legazpi City',                              contact: '0916-332-2158', image: '66cfc3f25edf53.62313944.png'  },
  { id: 37,   title: 'BIGGS MAGSAYSAY',    description: '24HRS | With FoodPanda & Function Hall | Abella lot corner Magsaysay and Dayangdang St., Balatas Naga City',       contact: '0993-613-7348', image: '66e137179edec5.34862951.png'  },
  { id: 38,   title: 'BIGGS SM LEGAZPI',   description: '10:00AM - 9:00PM | 2/F SM City Legazpi, Legazpi City',                                                            contact: '0917-715-3367', image: '66e2949022957.jpg'             },
  { id: 39,   title: 'BIGGS AYALA MALLS',  description: '10:00AM - 8:00PM | With FoodPanda | 2nd/F, Ayala Malls, Legazpi City',                                             contact: '0917-165-5000', image: '66e294c99bc2a.png'             },
  { id: 40,   title: 'BIGGS SM LIPA',      description: '10:00AM - 9:00PM | With FoodPanda | Ground/F, SM City Lipa',                                                       contact: '0916-332-2017', image: '672c7801eac71.jpg'             },
  { id: 41,   title: 'BIGGS BMC',          description: '7:00AM - 9:00PM | With FoodPanda | J. Miranda Avenue Concepcion Penuena Naga City',                                contact: '0970-668-1150', image: '673159eb7e645.JPG'             },
  { id: 43,   title: 'BIGGS DAET',         description: '10:00AM - 9:00PM | With FoodPanda | 2/F SM City Daet, Camarines Norte',                                            contact: '0991-176-7214', image: '6731701c13b57.jpg'             },
  { id: 44,   title: 'BIGGS SIPOCOT',      description: '24HRS | With Function Hall | Zone 4A Brgy. Tara, Sipocot Cam. Sur',                                               contact: '0994-757-1807', image: '67329df07e215.jpg'             },
  { id: 45,   title: 'BIGGS MASBATE',      description: '8:30AM - 8:00PM | With Function Hall | Gaisano Capital Masbate, Masbate City',                                     contact: '0916-332-2123', image: '67329ed827ab8.jpg'             },
  { id: 46,   title: 'BIGGS OLD ALBAY',    description: '24HRS | With FoodPanda & Function Hall | Rizal Corner Ma. Clara Street, Brgy. 150 Ilawod East Pob. Legazpi City', contact: '0916-332-2177', image: '6732a223080c2.JPG'             },
  { id: 48,   title: 'BIGGS POLANGUI',     description: '7:00AM - 9:00PM | With FoodPanda & Function Hall | K&A Blgd, Centro Oriental, Polangui',                           contact: '09076311821',   image: '675819bb143bb.jpeg'            },
  { id: 49,   title: 'BIGGS PAGBILAO',     description: '24HRS | With FoodPanda & Function Hall | Brgy. Talipan, Pagbilao, Quezon',                                         contact: '09278854651',   image: '693920dfd1185.jpg'             },
  { id: 50,   title: 'BIGGS GRANDE',       description: '24HRS | With FoodPanda & Function Hall | Lot 8, Zone 2, Maharlika National Highway, Concepcion Grande, Naga City', contact: '09275852042',   image: '693921b9854ee.jpg'             },
  { id: 51,   title: 'BIGGS TABACO',       description: '24HRS | With FoodPanda & Function Hall | Ziga Avenue, Tabaco City, Albay',                                         contact: '09369558498',   image: '6964bd068d779.jpg'             }
    
    ]);
    setLoading(false);
  }, []);

  const handleBookNow = (branchId: string) => {
    setSelectedBranchId(branchId);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (loading) return <div className="p-8 text-center">Loading branches...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="relative h-48 w-full">
              <Image
                src={branch.image ? `https://biggs.ph/biggs_website/controls/uploads/${branch.image}` : '/images/branch-placeholder.png'}
                alt={branch.title}
                layout="fill"
                objectFit="cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== window.location.origin + '/images/branch-placeholder.png') {
                    target.src = '/images/branch-placeholder.png';
                  }
                }}
              />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <FaStore className="text-blue-600" /> {branch.title}
              </h2>
              <p className="text-gray-600 mb-2 flex items-center gap-2">
                <FaClock className="text-gray-400" /> {branch.description}
              </p>
              <div className="mt-auto">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <FaPhone className="text-gray-400" /> Contact: {branch.contact}
                </div>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={() => handleBookNow(branch.id.toString())}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="mt-12" ref={formRef}>
          <SampleBookingForm preselectedBranchId={selectedBranchId} />
        </div>
      )}
    </>
  );
};

export default BookingPage;
