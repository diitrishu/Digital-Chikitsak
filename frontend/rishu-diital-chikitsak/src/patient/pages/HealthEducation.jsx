import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { BookOpen, Video, Search, Filter, Bookmark, Share2, Download, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const HealthEducation = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bookmarks, setBookmarks] = useState([]);
  const [likedItems, setLikedItems] = useState([]);
  const [contentData, setContentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthEducationContent();
  }, []);

  const loadHealthEducationContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/health-education');
      
      if (response.ok) {
        const data = await response.json();
        setContentData(data.content || []);
      } else {
        toast.error('Failed to load health education content');
      }
    } catch (error) {
      console.error('Error loading health education content:', error);
      toast.error('Failed to load health education content');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for health education content
  const categories = [
    { id: 'all', name: t('healthEducation.categories.all') },
    { id: 'general', name: t('healthEducation.categories.general') },
    { id: 'nutrition', name: t('healthEducation.categories.nutrition') },
    { id: 'exercise', name: t('healthEducation.categories.exercise') },
    { id: 'mentalHealth', name: t('healthEducation.categories.mentalHealth') },
    { id: 'prevention', name: t('healthEducation.categories.prevention') },
    { id: 'chronic', name: t('healthEducation.categories.chronic') }
  ];

  const mockContent = [
    {
      id: 1,
      title: t('healthEducation.articles.preventiveCare'),
      description: t('healthEducation.descriptions.preventiveCare'),
      type: 'article',
      category: 'prevention',
      duration: '5 min read',
      image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400',
      author: 'Dr. Sharma',
      date: '2023-05-15',
      views: 1250,
      likes: 42
    },
    {
      id: 2,
      title: t('healthEducation.videos.healthyCooking'),
      description: t('healthEducation.descriptions.healthyCooking'),
      type: 'video',
      category: 'nutrition',
      duration: '8 min',
      image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400',
      author: 'Nutritionist Kaur',
      date: '2023-06-22',
      views: 890,
      likes: 35
    },
    {
      id: 3,
      title: t('healthEducation.articles.diabetesManagement'),
      description: t('healthEducation.descriptions.diabetesManagement'),
      type: 'article',
      category: 'chronic',
      duration: '10 min read',
      image: 'https://images.unsplash.com/photo-1584989149220-3e680b6b49c7?w=400',
      author: 'Dr. Patel',
      date: '2023-04-10',
      views: 2100,
      likes: 87
    },
    {
      id: 4,
      title: t('healthEducation.videos.yogaBasics'),
      description: t('healthEducation.descriptions.yogaBasics'),
      type: 'video',
      category: 'exercise',
      duration: '12 min',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
      author: 'Yoga Instructor Singh',
      date: '2023-07-05',
      views: 1560,
      likes: 68
    },
    {
      id: 5,
      title: t('healthEducation.articles.mentalWellness'),
      description: t('healthEducation.descriptions.mentalWellness'),
      type: 'article',
      category: 'mentalHealth',
      duration: '7 min read',
      image: 'https://images.unsplash.com/photo-1487032420903-6c799c4d9d4d?w=400',
      author: 'Psychologist Gupta',
      date: '2023-03-18',
      views: 1890,
      likes: 76
    },
    {
      id: 6,
      title: t('healthEducation.videos.cardioWorkout'),
      description: t('healthEducation.descriptions.cardioWorkout'),
      type: 'video',
      category: 'exercise',
      duration: '15 min',
      image: 'https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=400',
      author: 'Fitness Trainer Mehta',
      date: '2023-08-12',
      views: 1340,
      likes: 54
    }
  ];

  const filteredContent = (contentData || []).filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleBookmark = (id) => {
    if (bookmarks.includes(id)) {
      setBookmarks(bookmarks.filter(bookmarkId => bookmarkId !== id));
    } else {
      setBookmarks([...bookmarks, id]);
    }
  };

  const toggleLike = (id) => {
    if (likedItems.includes(id)) {
      setLikedItems(likedItems.filter(likedId => likedId !== id));
    } else {
      setLikedItems([...likedItems, id]);
    }
  };

  const getTypeIcon = (type) => {
    return type === 'video' ? <Video size={16} /> : <BookOpen size={16} />;
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <AppShell title="Health Education">
      <div className="max-w-6xl mx-auto px-4 py-5">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {t('healthEducation.title')}
              </h1>
              <p className="text-gray-600">
                {t('healthEducation.subtitle')}
              </p>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={t('healthEducation.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('healthEducation.loadingContent')}</p>
              </div>
            ) : (
              <div>
                {filteredContent.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-xl font-medium text-gray-700 mb-2">
                      {t('healthEducation.noContentFound')}
                    </h3>
                    <p className="text-gray-500">
                      {t('healthEducation.tryDifferentSearch')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContent.map((item) => (
                      <div key={item.content_id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="relative">
                          <img 
                            src={`https://images.unsplash.com/photo-${item.content_id}?w=400&h=200&fit=crop`}
                            alt={item.title} 
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src = `https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=200&fit=crop`;
                            }}
                          />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <button
                              onClick={() => toggleBookmark(item.content_id)}
                              className={`p-2 rounded-full backdrop-blur-sm ${
                                bookmarks.includes(item.content_id)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/80 text-gray-700 hover:bg-white'
                              }`}
                            >
                              <Bookmark size={16} fill={bookmarks.includes(item.content_id) ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                            {getTypeIcon(item.content_type)}
                            <span>{item.duration}</span>
                          </div>
                        </div>
                        
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {getCategoryName(item.category)}
                            </span>
                            <span className="text-xs text-gray-500">{item.published_date}</span>
                          </div>
                          
                          <h3 className="font-bold text-lg mb-2 text-gray-800 line-clamp-2">
                            {item.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {item.description}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <span>{t('healthEducation.by')} {item.author}</span>
                            <span>{item.views_count} {t('healthEducation.views')}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleLike(item.content_id)}
                              className={`flex items-center gap-1 text-sm ${
                                likedItems.includes(item.content_id)
                                  ? 'text-red-600'
                                  : 'text-gray-600 hover:text-red-600'
                              }`}
                            >
                              <Heart size={16} fill={likedItems.includes(item.content_id) ? 'currentColor' : 'none'} />
                              <span>{item.likes_count + (likedItems.includes(item.content_id) ? 1 : 0)}</span>
                            </button>
                            
                            <div className="flex gap-2">
                              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                                <Share2 size={16} />
                                <span>{t('healthEducation.share')}</span>
                              </button>
                              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600">
                                <Download size={16} />
                                <span>{t('healthEducation.download')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Featured Content */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {t('healthEducation.featuredContent')}
              </h2>
              
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                <div className="p-8 text-white">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-4">
                        {t('healthEducation.articles.villageHealthGuide')}
                      </h3>
                      <p className="mb-6 opacity-90">
                        {t('healthEducation.descriptions.villageHealthGuide')}
                      </p>
                      <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                        {t('healthEducation.readNow')}
                      </button>
                    </div>
                    <div className="w-full md:w-1/3">
                      <img 
                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300" 
                        alt={t('healthEducation.articles.villageHealthGuide')}
                        className="rounded-lg shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppShell>
  );
};

export default HealthEducation;
