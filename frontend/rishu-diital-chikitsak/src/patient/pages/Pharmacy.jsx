import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Star, Package, TrendingDown, Clock } from 'lucide-react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import AppShell from '../components/AppShell';

const PharmacyFinder = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock medicine data
  const mockMedicines = [
    { id: 1, name: 'Paracetamol 500mg', generic: 'Acetaminophen', type: 'Tablet', description: 'Pain reliever and fever reducer' },
    { id: 2, name: 'Amoxicillin 500mg', generic: 'Amoxicillin', type: 'Capsule', description: 'Antibiotic for bacterial infections' },
    { id: 3, name: 'Ibuprofen 400mg', generic: 'Ibuprofen', type: 'Tablet', description: 'Nonsteroidal anti-inflammatory drug' },
    { id: 4, name: 'Cetirizine 10mg', generic: 'Cetirizine', type: 'Tablet', description: 'Antihistamine for allergies' },
    { id: 5, name: 'Omeprazole 20mg', generic: 'Omeprazole', type: 'Capsule', description: 'Proton pump inhibitor for acid reflux' },
    { id: 6, name: 'Metformin 500mg', generic: 'Metformin', type: 'Tablet', description: 'Medication for type 2 diabetes' },
  ];

  // Mock pharmacy data with stock and pricing
  const mockPharmacies = [
    {
      id: 1,
      name: 'City Medical Store',
      address: '123 Main Street, Punjab',
      distance: '0.5 km',
      rating: 4.5,
      phone: '+91 98765 43210',
      stock: [
        { medicineId: 1, price: 15, quantity: 100, discount: 10 },
        { medicineId: 2, price: 45, quantity: 50, discount: 0 },
        { medicineId: 3, price: 25, quantity: 75, discount: 5 },
        { medicineId: 4, price: 30, quantity: 30, discount: 15 },
      ]
    },
    {
      id: 2,
      name: 'HealthPlus Pharmacy',
      address: '456 Market Road, Punjab',
      distance: '1.2 km',
      rating: 4.2,
      phone: '+91 98765 43211',
      stock: [
        { medicineId: 1, price: 18, quantity: 200, discount: 0 },
        { medicineId: 2, price: 42, quantity: 40, discount: 5 },
        { medicineId: 3, price: 28, quantity: 60, discount: 0 },
        { medicineId: 5, price: 35, quantity: 25, discount: 10 },
      ]
    },
    {
      id: 3,
      name: 'Village Wellness Pharmacy',
      address: '789 Village Square, Punjab',
      distance: '2.3 km',
      rating: 4.7,
      phone: '+91 98765 43212',
      stock: [
        { medicineId: 1, price: 12, quantity: 150, discount: 15 },
        { medicineId: 3, price: 22, quantity: 80, discount: 10 },
        { medicineId: 4, price: 28, quantity: 40, discount: 0 },
        { medicineId: 6, price: 40, quantity: 20, discount: 5 },
      ]
    },
    {
      id: 4,
      name: '24/7 Medical Hub',
      address: '101 Hospital Road, Punjab',
      distance: '3.1 km',
      rating: 4.0,
      phone: '+91 98765 43213',
      stock: [
        { medicineId: 2, price: 48, quantity: 30, discount: 0 },
        { medicineId: 4, price: 32, quantity: 35, discount: 0 },
        { medicineId: 5, price: 38, quantity: 15, discount: 0 },
        { medicineId: 6, price: 42, quantity: 25, discount: 0 },
      ]
    }
  ];

  useEffect(() => {
    setMedicines(mockMedicines);
    setPharmacies(mockPharmacies);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const filtered = mockMedicines.filter(med => 
          med.name.toLowerCase().includes(query.toLowerCase()) ||
          med.generic.toLowerCase().includes(query.toLowerCase())
        );
        setMedicines(filtered);
        setLoading(false);
      }, 500);
    } else {
      setMedicines(mockMedicines);
    }
  };

  const handleMedicineSelect = (medicine) => {
    setSelectedMedicine(medicine);
    // Filter pharmacies that have this medicine in stock
    const pharmaciesWithStock = mockPharmacies
      .map(pharmacy => {
        const stockItem = pharmacy.stock.find(item => item.medicineId === medicine.id);
        return stockItem ? { ...pharmacy, stockItem } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.stockItem.price - b.stockItem.price); // Sort by price
    
    setPharmacies(pharmaciesWithStock);
  };

  const getBestDeal = (pharmacies) => {
    if (pharmacies.length === 0) return null;
    return pharmacies.reduce((best, current) => 
      current.stockItem.price < best.stockItem.price ? current : best
    );
  };

  const bestDeal = selectedMedicine ? getBestDeal(pharmacies) : null;

  return (
    <AppShell title="Pharmacy Finder">
      <div className="container mx-auto px-4 py-5">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#4ECDC4' }}>
            <Package className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t('pharmacy.title') || 'Pharmacy Finder'}
          </h1>
          <p className="text-gray-600">
            {t('pharmacy.subtitle') || 'Find nearby pharmacies and compare medicine prices'}
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('pharmacy.searchPlaceholder') || 'Search for medicines...'}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          {loading && (
            <div className="flex justify-center mt-4">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Medicine Search Results */}
        {!selectedMedicine && medicines.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t('pharmacy.searchResults') || 'Search Results'}
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map(medicine => (
                <div 
                  key={medicine.id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleMedicineSelect(medicine)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800">{medicine.name}</h3>
                      <p className="text-sm text-gray-600">{medicine.generic}</p>
                      <p className="text-xs text-gray-500 mt-1">{medicine.type}</p>
                    </div>
                    <Package className="text-teal-500" size={20} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{medicine.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Medicine and Pharmacy Results */}
        {selectedMedicine && (
          <div className="space-y-8">
            {/* Selected Medicine */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedMedicine.name}</h2>
                  <p className="text-gray-600">{selectedMedicine.generic}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedMedicine.type} • {selectedMedicine.description}</p>
                </div>
                <button 
                  onClick={() => setSelectedMedicine(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Best Deal Highlight */}
            {bestDeal && (
              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      {t('pharmacy.bestDeal') || 'Best Deal'}
                    </h3>
                    <p className="opacity-90">
                      {t('pharmacy.saveMessage', { 
                        pharmacy: bestDeal.name,
                        savings: Math.round((bestDeal.stockItem.price * 0.1) * 100) / 100
                      }) || `Save ₹${Math.round((bestDeal.stockItem.price * 0.1) * 100) / 100} at ${bestDeal.name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{bestDeal.stockItem.price}</div>
                    {bestDeal.stockItem.discount > 0 && (
                      <div className="text-sm opacity-90">
                        {t('pharmacy.discount', { discount: bestDeal.stockItem.discount }) || `${bestDeal.stockItem.discount}% off`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pharmacy List */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {t('pharmacy.availablePharmacies') || 'Available Pharmacies'}
              </h2>
              
              <div className="space-y-4">
                {pharmacies.map(pharmacy => (
                  <div key={pharmacy.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-800">{pharmacy.name}</h3>
                          <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                            <Star size={12} fill="currentColor" />
                            {pharmacy.rating}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin size={16} />
                          <span className="text-sm">{pharmacy.address}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={16} />
                          <span className="text-sm">{pharmacy.phone}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-800">₹{pharmacy.stockItem.price}</div>
                        {pharmacy.stockItem.discount > 0 && (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <TrendingDown size={14} />
                            {pharmacy.stockItem.discount}% off
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {pharmacy.stockItem.quantity} {t('pharmacy.inStock') || 'in stock'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pharmacy.distance}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      <button className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        {t('pharmacy.orderNow') || 'Order Now'}
                      </button>
                      <button className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                        {t('pharmacy.call') || 'Call Pharmacy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedMedicine && medicines.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              {t('pharmacy.noResults') || 'No medicines found'}
            </h3>
            <p className="text-gray-500">
              {t('pharmacy.tryAgain') || 'Try searching for a different medicine'}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default PharmacyFinder;
