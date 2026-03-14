import { type MenuItem} from '../../types';

interface Props {
  item:    MenuItem;
  onClick: (item: MenuItem) => void;
}

export default function ItemCard({ item, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(item)}
      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                 border border-gray-100"
    >
      {/* Image */}
      <div className="h-40 bg-gray-100 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight">
            {item.name}
          </h3>
          {!item.isAvailable && (
            <span className="text-xs bg-red-100 text-red-500
                             px-2 py-0.5 rounded-full whitespace-nowrap">
              Sold Out
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex justify-between items-center mt-3">
          <span className="text-orange-500 font-bold text-sm">
            ${Number(item.price).toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">
            ⏱ {item.prepTimeMins} min
          </span>
        </div>

        <button
          disabled={!item.isAvailable}
          className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg transition
                     bg-orange-500 hover:bg-orange-600 text-white
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
}