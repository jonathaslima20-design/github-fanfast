import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCustomSizes } from '@/hooks/useCustomSizes';

interface CustomSizeInputProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  userId?: string;
  maxSizes?: number;
  placeholder?: string;
}

export function CustomSizeInput({
  value = [],
  onChange,
  userId,
  maxSizes = 10,
  placeholder = "Digite um tamanho personalizado..."
}: CustomSizeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { customSizes, addCustomSize, removeCustomSize } = useCustomSizes(userId);

  // Combine saved custom sizes with current value for suggestions
  const allAvailableSizes = [...new Set([...customSizes, ...value])];

  const handleAddSize = async () => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) return;
    
    if (value.length >= maxSizes) {
      return;
    }

    if (value.includes(trimmedValue)) {
      setInputValue('');
      return;
    }

    // Add to current selection
    const newSizes = [...value, trimmedValue];
    onChange(newSizes);

    // Save to database for future use
    if (userId) {
      await addCustomSize(trimmedValue, 'custom');
    }

    setInputValue('');
  };

  const handleRemoveSize = async (sizeToRemove: string) => {
    const newSizes = value.filter(size => size !== sizeToRemove);
    onChange(newSizes);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSize();
    }
  };

  const handleSuggestionClick = (size: string) => {
    if (value.includes(size) || value.length >= maxSizes) return;
    
    const newSizes = [...value, size];
    onChange(newSizes);
  };

  return (
    <div className="space-y-3">
      {/* Input para adicionar novos tamanhos */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddSize}
          disabled={!inputValue.trim() || value.length >= maxSizes}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tamanhos selecionados */}
      {value.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Tamanhos Selecionados:</div>
          <div className="flex flex-wrap gap-2">
            {value.map((size) => (
              <Badge
                key={size}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {size}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveSize(size)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões de tamanhos salvos */}
      {allAvailableSizes.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Tamanhos Disponíveis:</div>
          <div className="flex flex-wrap gap-2">
            {allAvailableSizes
              .filter(size => !value.includes(size))
              .map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(size)}
                  disabled={value.length >= maxSizes}
                  className="h-8 text-xs"
                >
                  {size}
                </Button>
              ))}
          </div>
        </div>
      )}

      {/* Contador e limite */}
      <div className="text-xs text-muted-foreground">
        {value.length}/{maxSizes} tamanhos adicionados
      </div>
    </div>
  );
}