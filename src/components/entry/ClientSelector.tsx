import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ClientSelectorProps {
  value: string;
  onChange: (clientId: string) => void;
  onCreateNew: () => void;
  showValidation?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ClientSelector({
  value,
  onChange,
  onCreateNew,
  showValidation = false,
  disabled = false,
  placeholder = "Selecione o cliente...",
  className,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const { clients, isLoading } = useClients();

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === value);
  }, [clients, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between h-11 font-normal",
            !value && "text-muted-foreground",
            showValidation && !value && "border-destructive",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedClient ? (
              <>
                <User size={16} className="text-primary flex-shrink-0" />
                <span className="truncate">{selectedClient.name}</span>
              </>
            ) : (
              <span>{isLoading ? "Carregando..." : placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <User size={16} className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    {client.phone && (
                      <span className="text-xs text-muted-foreground">{client.phone}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="flex items-center gap-2 text-primary"
              >
                <Plus size={16} />
                <span>Criar novo cliente</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
