import React from 'react';

interface SearchComponentProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const SearchComponent = ({ value = "", onChange, placeholder = "Search..." }: SearchComponentProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <div id="main" className="relative group">
        <input 
          placeholder={placeholder} 
          type="text" 
          name="text" 
          value={value}
          onChange={handleInputChange}
          className="bg-background border border-stone-200 dark:border-white/10 w-[420px] h-[40px] rounded-lg text-foreground px-[40px] text-sm focus:outline-none placeholder-muted-foreground" 
        />
        
        <div id="search-icon" className="absolute left-3 top-[8px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="18" fill="none" className="feather feather-search">
            <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
            <line stroke="url(#searchl)" y2="16.65" y1="22" x2="16.65" x1="22"></line>
            <defs>
              <linearGradient gradientTransform="rotate(50)" id="search">
                <stop stopColor="currentColor" offset="0%" className="text-muted-foreground"></stop>
                <stop stopColor="currentColor" offset="50%" className="text-foreground"></stop>
              </linearGradient>
              <linearGradient id="searchl">
                <stop stopColor="currentColor" offset="0%" className="text-foreground"></stop>
                <stop stopColor="currentColor" offset="50%" className="text-muted-foreground"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SearchComponent;
