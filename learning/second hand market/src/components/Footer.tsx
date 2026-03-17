import { useAppContext } from '../context/AppContext';

interface FooterProps {
  onFeatureClick: (feature: string) => void;
}

export default function Footer({ onFeatureClick }: FooterProps) {
  const { appOffer, currentUser } = useAppContext();

  return (
    <footer className="bg-white pt-12 pb-8 border-t">
      <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-[#0f136d] font-medium mb-4">Customer Care</h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li><button onClick={() => onFeatureClick('Help Center')} className="hover:underline text-left">Help Center</button></li>
            <li><button onClick={() => onFeatureClick('How to Buy')} className="hover:underline text-left">How to Buy</button></li>
            <li><button onClick={() => onFeatureClick('Returns & Refunds')} className="hover:underline text-left">Returns & Refunds</button></li>
            <li><button onClick={() => { if (currentUser) { onFeatureClick('Customer Care'); } else { onFeatureClick('LoginOnly'); } }} className="hover:underline text-left">Contact Us</button></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[#0f136d] font-medium mb-4">Second Hand Market</h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li><button onClick={() => onFeatureClick('About Second Hand Market')} className="hover:underline text-left">About Second Hand Market</button></li>
            <li><button onClick={() => onFeatureClick('Careers')} className="hover:underline text-left">Careers</button></li>
            <li><button onClick={() => onFeatureClick('Second Hand Market Blog')} className="hover:underline text-left">Second Hand Market Blog</button></li>
            <li><button onClick={() => onFeatureClick('Terms & Conditions')} className="hover:underline text-left">Terms & Conditions</button></li>
            <li><button onClick={() => onFeatureClick('Privacy Policy')} className="hover:underline text-left">Privacy Policy</button></li>
          </ul>
        </div>
        <div className="md:col-span-2 flex flex-col sm:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => onFeatureClick('Save More on App')} className="block text-left">
                <div className="w-16 h-16 bg-gray-100 rounded shadow-sm hover:opacity-80 transition-opacity flex items-center justify-center border border-gray-200">
                  <div className="grid grid-cols-2 gap-0.5 w-8 h-8">
                    <div className="bg-black rounded-sm"></div>
                    <div className="bg-black rounded-sm"></div>
                    <div className="bg-black rounded-sm"></div>
                    <div className="bg-[#f85606] rounded-sm"></div>
                  </div>
                </div>
              </button>
              <div>
                <div className="text-[#f85606] font-medium">
                  {appOffer?.isActive ? `Get ${appOffer.discount} Off!` : 'Happy Shopping'}
                </div>
                <button onClick={() => onFeatureClick('Save More on App')} className="text-xs text-blue-600 hover:underline font-medium block mt-1 text-left">
                  Download App
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onFeatureClick('Save More on App')} className="hover:opacity-80 transition-opacity block">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" referrerPolicy="no-referrer" />
              </button>
              <button onClick={() => onFeatureClick('Save More on App')} className="hover:opacity-80 transition-opacity block">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8" referrerPolicy="no-referrer" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
