import React from 'react';
import { Search, Check, Sparkles } from 'lucide-react';

export default function CatalogDrawer({
  catalogItems,
  selectedGarment,
  onOutfitClick,
  activeDepartment,
  setActiveDepartment,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  isProcessing,
  processingGarmentId
}) {
  const categoriesByDept = {
    Indian: ['all', 'sarees', 'kurtis', 'lehengas', 'sherwanis'],
    Western: ['all', 'dresses', 'shirts', 't-shirts', 'jackets'],
    All: ['all', 'sarees', 'kurtis', 'lehengas', 'sherwanis', 'dresses', 'shirts', 't-shirts', 'jackets']
  };

  const activeCategoriesList = categoriesByDept[activeDepartment] || categoriesByDept.All;

  // Filter items
  const filteredItems = catalogItems.filter(item => {
    // Dept match
    if (activeDepartment !== 'All' && item.department.toLowerCase() !== activeDepartment.toLowerCase()) {
      return false;
    }
    // Category match
    if (activeCategory !== 'all' && item.category.toLowerCase() !== activeCategory.toLowerCase()) {
      return false;
    }
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchFabric = (item.fabric || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchFabric) return false;
    }
    return true;
  });

  return (
    <div className="catalog-drawer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '20px', color: 'var(--gold-light)' }}>
          Atelier Collection
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredItems.length} styles
        </span>
      </div>

      {/* Department Switcher Tabs */}
      <div className="dept-tabs">
        {['All', 'Indian', 'Western'].map(dept => (
          <button
            key={dept}
            className={`dept-tab-btn ${activeDepartment === dept ? 'active' : ''}`}
            onClick={() => {
              setActiveDepartment(dept);
              setActiveCategory('all');
            }}
          >
            {dept === 'All' ? 'All Collections' : dept === 'Indian' ? 'Indian Couture' : 'Western Atelier'}
          </button>
        ))}
      </div>

      {/* Category Filter Chips */}
      <div className="category-chips">
        {activeCategoriesList.map(cat => (
          <button
            key={cat}
            className={`chip-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="search-wrapper">
        <Search className="search-icon" />
        <input 
          type="text"
          className="search-input"
          placeholder="Search by fabric, color, or style..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Product Cards Scroll Area */}
      <div className="products-scroll-area">
        {filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
            No outfits match your search criteria.
          </div>
        ) : (
          filteredItems.map(item => {
            const isSelected = selectedGarment && selectedGarment.id === item.id;
            const isCurrentlyFitting = isProcessing && processingGarmentId === item.id;

            return (
              <div 
                key={item.id}
                className={`product-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onOutfitClick(item)}
                title={`Click to try on ${item.name}`}
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--gold)' : undefined,
                  boxShadow: isCurrentlyFitting ? '0 0 20px rgba(223, 177, 91, 0.5)' : undefined
                }}
              >
                <div className="product-image-box">
                  <img src={item.image_url} alt={item.name} loading="lazy" />
                  <span className="product-category-tag">
                    {item.category}
                  </span>
                  
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                      color: '#0d0a12',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      boxShadow: '0 0 12px var(--gold-glow)'
                    }}>
                      {isCurrentlyFitting ? (
                        <>
                          <Sparkles size={12} className="spin-slow" />
                          <span>Fitting...</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} strokeWidth={3} />
                          <span>Selected</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="product-info">
                  <div className="product-name">{item.name}</div>
                  <div className="product-fabric">{item.fabric || item.color}</div>
                  <div className="product-bottom-row">
                    <span className="product-price">₹{item.price.toLocaleString()}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: isSelected ? 'var(--gold)' : 'var(--text-muted)',
                      fontWeight: isSelected ? '600' : '400'
                    }}>
                      {isSelected ? (isCurrentlyFitting ? 'Fitting...' : 'Wearing') : 'Click to Try'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
