import React from 'react';
import { useData } from '../context/DataContext';
import GiftCardView from '../components/GiftCardView';

const GiftCardsPage: React.FC = () => {
    const { giftCards, addGiftCard, updateGiftCard, deleteGiftCard, consumeGiftCard, cancelGiftCard, isLoadingData } = useData();

    if (isLoadingData) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">
                Cargando datos...
            </div>
        );
    }

    return (
        <GiftCardView
            giftCards={giftCards}
            onAddGiftCard={addGiftCard}
            onUpdateGiftCard={updateGiftCard}
            onConsumeGiftCard={consumeGiftCard}
            onCancelGiftCard={cancelGiftCard}
            onDeleteGiftCard={deleteGiftCard}
        />
    );
};

export default GiftCardsPage;
