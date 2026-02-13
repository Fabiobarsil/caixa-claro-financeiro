import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export default function ProfileEditor() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Save to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarPreview(urlWithCacheBust);
      await refreshUser();
      toast.success('Foto atualizada!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error('Erro ao enviar foto');
      setAvatarPreview(user.avatarUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshUser();
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card rounded-xl border border-border mb-6">
      <div className="p-4 border-b border-border">
        <p className="font-medium text-foreground">Meu Perfil</p>
        <p className="text-sm text-muted-foreground">Edite suas informações pessoais</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />

          <p className="text-xs text-muted-foreground">Toque no ícone para alterar a foto</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Nome Completo *</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">Telefone</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full"
        >
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
