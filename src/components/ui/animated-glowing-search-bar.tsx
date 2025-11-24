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
      <div className="absolute z-[-1] w-full h-min-screen"></div>
      <div id="poda" className="relative flex items-center justify-center group">
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[50px] max-w-[440px] rounded-xl blur-[2px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-60
                        before:bg-[conic-gradient(hsl(var(--background)),#402fb5_5%,hsl(var(--background))_38%,hsl(var(--background))_50%,#cf30aa_60%,hsl(var(--background))_87%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[48px] max-w-[436px] rounded-xl blur-[2px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#18116a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#6e1b60,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[48px] max-w-[436px] rounded-xl blur-[2px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#18116a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#6e1b60,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[48px] max-w-[436px] rounded-xl blur-[2px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#18116a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#6e1b60,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>

        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[46px] max-w-[430px] rounded-lg blur-[1px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#a099d8,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#dfa2da,rgba(0,0,0,0)_58%)] before:brightness-140
                        before:transition-all before:duration-2000 group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>

        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[44px] max-w-[424px] rounded-xl blur-[0.5px] dark:block hidden
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-70
                        before:bg-[conic-gradient(hsl(var(--background)),#402fb5_5%,hsl(var(--background))_14%,hsl(var(--background))_50%,#cf30aa_60%,hsl(var(--background))_64%)] before:brightness-130
                        before:transition-all before:duration-2000 group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:[transition-duration:4000ms]">
        </div>

        <div id="main" className="relative group">
          <input 
            placeholder={placeholder} 
            type="text" 
            name="text" 
            value={value}
            onChange={handleInputChange}
            className="bg-background border border-border w-[420px] h-[40px] rounded-lg text-foreground px-[40px] text-sm focus:outline-none placeholder-muted-foreground" 
          />
          <div id="pink-mask" className="pointer-events-none w-[20px] h-[12px] absolute bg-[#cf30aa] top-[6px] left-[3px] blur-xl opacity-80 transition-all duration-2000 group-hover:opacity-0"></div>
          
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
    </div>
  );
};

export default SearchComponent;
