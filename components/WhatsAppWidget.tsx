import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/L4DgT0ZQGt9E2CalDKBP8J';

const WhatsAppWidget: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(true);
  const { pathname } = useLocation();

  if (pathname === '/admin') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {showTooltip && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 max-w-[260px] animate-fade-in relative">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Fermer"
          >
            &times;
          </button>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Rejoignez notre communauté
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Recevez les nouvelles offres d'emploi Souss-Massa directement sur WhatsApp
          </p>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full text-center bg-[#25D366] text-white text-sm font-bold py-2 px-4 rounded-xl hover:bg-[#1da851] transition-colors"
          >
            Rejoindre maintenant
          </a>
        </div>
      )}
      <a
        href={WHATSAPP_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => showTooltip && setShowTooltip(false)}
        className="bg-[#25D366] hover:bg-[#1da851] w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 flex-shrink-0"
        aria-label="Rejoindre la communauté WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="white">
          <path d="M16.004 2.667A13.26 13.26 0 0 0 2.67 15.923a13.16 13.16 0 0 0 1.795 6.636L2.667 29.333l7.005-1.77a13.3 13.3 0 0 0 6.332 1.607h.005c7.32 0 13.324-5.95 13.324-13.267A13.21 13.21 0 0 0 16.004 2.667Zm0 24.27a11.03 11.03 0 0 1-5.618-1.535l-.403-.24-4.178 1.094 1.115-4.07-.263-.418a10.93 10.93 0 0 1-1.685-5.84c0-6.065 4.94-11.003 11.037-11.003a11.01 11.01 0 0 1 11.026 11.023c0 6.065-4.95 11.003-11.031 10.99Zm6.048-8.24c-.332-.166-1.964-.97-2.269-1.08-.305-.111-.527-.166-.749.167-.222.332-.86 1.08-1.054 1.302-.194.222-.389.25-.72.083-.332-.166-1.403-.517-2.672-1.648-.987-.88-1.654-1.966-1.848-2.298-.194-.332-.02-.512.146-.678.15-.148.332-.389.499-.583.166-.194.222-.332.332-.555.111-.222.056-.416-.028-.583-.083-.166-.749-1.803-1.026-2.468-.27-.649-.545-.56-.749-.571l-.638-.011a1.225 1.225 0 0 0-.888.416c-.305.332-1.165 1.136-1.165 2.773 0 1.636 1.193 3.217 1.358 3.44.167.221 2.348 3.582 5.688 5.023.795.343 1.415.548 1.899.702.798.253 1.524.218 2.098.132.64-.095 1.964-.803 2.24-1.58.278-.776.278-1.44.195-1.58-.083-.138-.305-.222-.638-.388Z"/>
        </svg>
      </a>
    </div>
  );
};

export default WhatsAppWidget;
