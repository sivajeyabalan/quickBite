import { memo } from 'react';
import { type MenuItem} from '../../types';
import { isItemOrderable, getStockStatus, optimizeMenuImage } from './helpers/availability';

interface Props {
  item:    MenuItem;
  onClick: (item: MenuItem) => void;
}

const ItemCard = memo(function ItemCard({ item, onClick }: Props) {
  const { available, reason } = isItemOrderable(item);
  const stockStatus = getStockStatus(item);
  const optimizedImage = optimizeMenuImage(item.imageUrl);

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                 border border-gray-100"
    >
      {/* Image */}
      <div className="h-40 bg-gray-100 overflow-hidden relative">
        {optimizedImage ? (
          <img
            src={optimizedImage}
            alt={item.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽
          </div>
        )}
        
        {/* Stock/86 Badge */}
        {!available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
              {reason}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-heading font-semibold text-gray-800 text-sm leading-tight">
            {item.name}
          </h3>
        </div>

        {item.description && (
          <p className="font-body text-xs text-gray-500 mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex justify-between items-center mt-3">
          <span className="font-accent font-bold text-orange-500 text-sm">
            ${Number(item.price).toFixed(2)}
          </span>
          <span className="font-body text-xs text-gray-400">
            ⏱ {item.prepTimeMins} min
          </span>
        </div>

        {stockStatus && (
          <p className="body-text-sm text-amber-600 mt-1 font-medium">
            {stockStatus}
          </p>
        )}

        <button
          disabled={!available}
          className="mt-3 w-full button-text py-1.5 rounded-lg transition
                     bg-orange-500 hover:bg-orange-600 text-white
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {available ? 'Add to Cart' : reason || 'Unavailable'}
        </button>
      </div>
    </div>
  );
});

export default ItemCard;