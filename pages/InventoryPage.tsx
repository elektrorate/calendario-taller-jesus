import React from 'react';
import { useData } from '../context/DataContext';
import InventoryView from '../components/InventoryView';

const InventoryPage: React.FC = () => {
    const { inventoryItems, inventoryMovements, addInventoryItem, updateInventoryItem, archiveInventoryItem, deleteInventoryItem, addInventoryMovement, isLoadingData } = useData();

    if (isLoadingData) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">
                Cargando datos...
            </div>
        );
    }

    return (
        <InventoryView
            items={inventoryItems}
            movements={inventoryMovements}
            onAddItem={addInventoryItem}
            onUpdateItem={updateInventoryItem}
            onArchiveItem={archiveInventoryItem}
            onDeleteItem={deleteInventoryItem}
            onAddMovement={addInventoryMovement}
        />
    );
};

export default InventoryPage;
