import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import type { MenuItem } from '../../types';
import { addItem, toggleCart } from '../cart/cardSlice';
import { isItemOrderable } from './helpers/availability';
import type { AppDispatch } from '../../app/store';

interface Props {
  item:    MenuItem | null;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const [quantity, setQuantity]               = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  if (!item) return null;

  const options = item.customisationOptions || {};
  const { available, reason } = isItemOrderable(item);
  const maxQty = item.stockQty >= 0 ? item.stockQty : Infinity;

  const handleOptionSelect = (group: string, value: string) => {
    setSelectedOptions(prev => {
      const next = { ...prev };
      if (next[group] === value) {
        delete next[group];
      } else {
        next[group] = value;
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    dispatch(addItem({
      menuItemId:     item.id,
      name:           item.name,
      price:          Number(item.price),
      quantity,
      imageUrl:       item.imageUrl,
      customisations: selectedOptions,
    }));
    dispatch(toggleCart());
    toast.success(`${item.name} added to cart`);
    onClose();
  };

  const total = (Number(item.price) * quantity).toFixed(2);

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center
                 justify-center p-4"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh]
                   overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="h-52 bg-gray-100 overflow-hidden rounded-t-2xl">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🍽
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="heading-3 text-gray-800">{item.name}</h2>
              <p className="body-text-sm text-gray-500 mt-1">
                ⏱ {item.prepTimeMins} min prep time
              </p>
            </div>
            <span className="accent-text font-bold text-orange-500">
              ${Number(item.price).toFixed(2)}
            </span>
          </div>

          {item.description && (
            <p className="font-body text-sm text-gray-600 mt-3 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Customisation Options */}
          {Object.keys(options).length > 0 && (
            <div className="mt-5 space-y-4">
              <h3 className="heading-4 text-gray-700">
                Customise Your Order
              </h3>

              {Object.entries(options).map(([group, values]) => (
                <div key={group}>
                  <p className="label-text text-gray-500 uppercase
                                tracking-wide mb-2">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(values as string[]).map(value => (
                      <button
                        key={value}
                        onClick={() => handleOptionSelect(group, value)}
                        className={`px-3 py-1.5 rounded-full label-text
                                    border transition
                          ${selectedOptions[group] === value
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
                          }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Availability Warning */}
          {!available && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="label-text text-red-600">{reason}</p>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mt-6">
            <span className="font-ui text-sm font-medium text-gray-700">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-300
                           flex items-center justify-center text-gray-600
                           hover:border-orange-400 transition"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                className="w-8 h-8 rounded-full border border-gray-300
                           flex items-center justify-center text-gray-600
                           hover:border-orange-400 transition"
              >
                +
              </button>
            </div>
          </div>
          
          {maxQty !== Infinity && (
            <p className="text-xs text-gray-500 mt-2">
              Only {maxQty} available
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300
                         font-ui text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!available}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                         button-text text-white text-sm font-semibold transition
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {available ? `Add to Cart — $${total}` : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
