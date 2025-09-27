import { supabase } from '../integrations/supabase/client';
import type { CV, UploadedCV } from '../types/cv';

export class CVStorageService {
  private readonly bucket = 'cv-files';

  async uploadCV(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `cvs/${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(this.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur d'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async getPreviewUrl(filePath: string): Promise<string> {
    const cleanPath = this.extractFilePath(filePath);
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(cleanPath, 300);

    if (error) {
      throw new Error(`Erreur de création d'URL signée: ${error.message}`);
    }

    return data.signedUrl;
  }

  async deleteFile(filePath: string): Promise<void> {
    const cleanPath = this.extractFilePath(filePath);
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([cleanPath]);

    if (error) {
      throw new Error(`Erreur de suppression: ${error.message}`);
    }
  }

  private extractFilePath(fileUrl: string): string {
    if (!fileUrl) throw new Error('URL du fichier non fournie');
    
    // Si l'URL contient déjà le chemin du bucket
    if (fileUrl.includes(`${this.bucket}/`)) {
      return fileUrl.split(`${this.bucket}/`)[1];
    }
    
    // Si c'est une URL complète
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === this.bucket);
    
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    throw new Error('Format d\'URL non valide');
  }

  async saveMetadata(cv: Partial<UploadedCV>): Promise<CV> {
    // Construire explicitement l'objet attendu par la table cv_uploads
    const payload = {
      user_id: cv.user_id || null,
      filename: cv.filename || '',
      file_size: cv.file_size || 0,
      file_data: cv.file_data || cv.file_url || '',
      mime_type: cv.mime_type || 'application/pdf',
      file_format: cv.file_format || 'pdf',
      upload_type: cv.upload_type || 'direct',
      processing_method: cv.processing_method || 'none',
      raw_text: cv.raw_text || '',
      structured_data: cv.structured_data || {},
      is_active: typeof cv.is_active === 'boolean' ? cv.is_active : true,
      is_default: typeof cv.is_default === 'boolean' ? cv.is_default : false
    };

    const { data, error } = await supabase
      .from('cv_uploads')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }

    return this.formatCV(data);
  }

  private formatCV(data: any): CV {
    return {
      id: data.id,
      filename: data.filename,
      file_size: data.file_size,
      file_url: data.file_data,
      created_at: data.created_at,
      is_default: data.is_default || false,
      mime_type: data.mime_type
    };
  }
}