import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'arduino-workspaces';
const DEFAULT_TEMPLATE = `void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  
}`;

export const StorageService = {
  /**
   * Initialize the storage bucket if it doesn't exist
   */
  async initBucket() {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
      
      if (!bucketExists) {
        // Create the bucket with public access
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: false, // Keep files private, accessible only to authenticated users
          fileSizeLimit: 1024 * 1024 * 5, // 5MB limit
        });
        
        if (error) throw error;
        console.log(`Created storage bucket: ${BUCKET_NAME}`);
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      throw error;
    }
  },

  /**
   * Get all files for the current user
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of file objects
   */
  async getUserFiles(userId) {
    try {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId, {
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user files:', error);
      return [];
    }
  },

  /**
   * Get file content
   * @param {string} userId - The user's ID
   * @param {string} fileName - The file name
   * @returns {Promise<string>} - File content
   */
  async getFileContent(userId, fileName) {
    try {
      console.log('StorageService.getFileContent called with:', { userId, fileName });
      
      if (!userId || !fileName) throw new Error('User ID and file name are required');
      
      const filePath = `${userId}/${fileName}`;
      console.log('Attempting to download from path:', filePath);
      
      // Generate a unique cache-busting parameter
      const cacheBuster = `?t=${new Date().getTime()}`;
      
      // First attempt to download with cache busting
      let downloadResult = await supabase.storage
        .from(BUCKET_NAME)
        .download(`${filePath}${cacheBuster}`);
      
      // If there's an error, try without cache busting
      if (downloadResult.error) {
        console.log('Download with cache busting failed, trying without:', downloadResult.error);
        downloadResult = await supabase.storage
          .from(BUCKET_NAME)
          .download(filePath);
      }
      
      // If there's still an error, try with signed URL
      if (downloadResult.error) {
        console.error('Standard download attempts failed:', downloadResult.error);
        
        // Try to get the file URL and fetch it directly with cache busting
        const { data: urlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filePath, 60); // 60 seconds expiry
        
        if (urlData?.signedUrl) {
          // Add cache busting to the signed URL
          const signedUrlWithCacheBuster = `${urlData.signedUrl}${urlData.signedUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
          console.log('Attempting to fetch via signed URL with cache busting:', signedUrlWithCacheBuster);
          
          const response = await fetch(signedUrlWithCacheBuster, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            const blob = await response.blob();
            downloadResult = { data: blob, error: null };
          }
        }
      }
      
      // If we still have an error, throw it
      if (downloadResult.error) {
        console.error('All download attempts failed:', downloadResult.error);
        throw downloadResult.error;
      }
      
      console.log('File downloaded successfully, data type:', typeof downloadResult.data);
      
      // Convert blob to text
      const content = await downloadResult.data.text();
      console.log('Content converted to text, length:', content.length);
      
      // If content is empty but we didn't get an error, that's suspicious
      if (content.trim() === '') {
        console.warn('Downloaded file is empty, this might indicate an issue');
      }
      
      return content;
    } catch (error) {
      console.error(`Error fetching file content for ${fileName}:`, error);
      throw error;
    }
  },

  /**
   * Create a new file with default template
   * @param {string} userId - The user's ID
   * @param {string} fileName - The file name (must end with .ino or .fzz)
   * @param {string} customTemplate - Optional custom template for the file
   * @returns {Promise<Object>} - Result object
   */
  async createFile(userId, fileName, customTemplate) {
    try {
      if (!userId || !fileName) throw new Error('User ID and file name are required');
      
      // Determine file type and template
      let validFileName, template;
      
      if (fileName.endsWith('.fzz')) {
        validFileName = fileName;
        template = customTemplate || '<?xml version="1.0" encoding="UTF-8"?>\n<module fritzingVersion="0.9.3">\n  <title>' + fileName + '</title>\n  <instances>\n    <!-- Circuit components will be added here -->\n  </instances>\n  <connections>\n    <!-- Connections between components will be added here -->\n  </connections>\n</module>';
      } else {
        // Default to .ino file
        validFileName = fileName.endsWith('.ino') ? fileName : `${fileName}.ino`;
        template = customTemplate || DEFAULT_TEMPLATE;
      }
      
      const filePath = `${userId}/${validFileName}`;
      
      // Upload file with appropriate template
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, template, {
          contentType: 'text/plain',
          upsert: false // Don't overwrite if exists
        });
      
      if (error) throw error;
      
      return { 
        success: true, 
        path: filePath,
        name: validFileName,
        content: template
      };
    } catch (error) {
      console.error(`Error creating file ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save file content
   * @param {string} userId - The user's ID
   * @param {string} fileName - The file name
   * @param {string} content - The file content
   * @returns {Promise<Object>} - Result object
   */
  async saveFile(userId, fileName, content) {
    try {
      if (!userId || !fileName) throw new Error('User ID and file name are required');
      
      const filePath = `${userId}/${fileName}`;
      console.log('Saving file to path:', filePath, 'Content length:', content?.length || 0);
      
      // First try to delete the existing file to avoid caching issues
      try {
        console.log('Attempting to delete existing file before saving');
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
        console.log('Existing file deleted successfully');
      } catch (deleteError) {
        // It's okay if the file doesn't exist yet
        console.log('Delete before save operation:', deleteError?.message || 'No file existed to delete');
      }
      
      // Add a small delay to ensure deletion is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to save as text
      let result = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, content, {
          contentType: 'text/plain',
          upsert: true, // Overwrite if exists
          cacheControl: 'no-cache' // Prevent caching
        });
      
      // If there's an error, try with different content type or as Blob
      if (result.error) {
        console.log('First upload attempt failed, trying as Blob:', result.error);
        
        // Convert string to Blob
        const blob = new Blob([content], { type: 'text/plain' });
        
        result = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, blob, {
            contentType: 'text/plain',
            upsert: true, // Overwrite if exists
            cacheControl: 'no-cache' // Prevent caching
          });
      }
      
      if (result.error) throw result.error;
      
      // Add a small delay to ensure upload is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the file was saved correctly by downloading it
      const verifyResult = await this.getFileContent(userId, fileName);
      console.log('Verification result - content length:', verifyResult?.length || 0);
      
      // Check if verification failed
      if (!verifyResult || verifyResult.trim() === '') {
        console.warn('Verification failed - empty content returned');
        throw new Error('File verification failed - could not retrieve saved content');
      }
      
      // Check if content matches what we tried to save
      if (verifyResult !== content) {
        console.warn('Verification warning - content mismatch');
        console.log('Original content length:', content.length, 'Retrieved content length:', verifyResult.length);
      }
      
      return { success: true, path: filePath };
    } catch (error) {
      console.error(`Error saving file ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a file
   * @param {string} userId - The user's ID
   * @param {string} fileName - The file name
   * @returns {Promise<Object>} - Result object
   */
  async deleteFile(userId, fileName) {
    try {
      if (!userId || !fileName) throw new Error('User ID and file name are required');
      
      const filePath = `${userId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting file ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Rename a file
   * @param {string} userId - The user's ID
   * @param {string} oldFileName - The old file name
   * @param {string} newFileName - The new file name
   * @returns {Promise<Object>} - Result object
   */
  async renameFile(userId, oldFileName, newFileName) {
    try {
      if (!userId || !oldFileName || !newFileName) {
        throw new Error('User ID, old file name, and new file name are required');
      }
      
      // Determine file type and ensure proper extension
      let validNewFileName;
      if (oldFileName.endsWith('.fzz') || newFileName.endsWith('.fzz')) {
        // For .fzz files
        validNewFileName = newFileName.endsWith('.fzz') ? newFileName : `${newFileName}.fzz`;
      } else {
        // Default to .ino files
        validNewFileName = newFileName.endsWith('.ino') ? newFileName : `${newFileName}.ino`;
      }
      
      // Get the content of the old file
      const content = await this.getFileContent(userId, oldFileName);
      
      // Create the new file with the same content
      const { success, error: createError } = await this.saveFile(userId, validNewFileName, content);
      if (!success) throw new Error(createError);
      
      // Delete the old file
      const { success: deleteSuccess, error: deleteError } = await this.deleteFile(userId, oldFileName);
      if (!deleteSuccess) throw new Error(deleteError);
      
      return { 
        success: true, 
        oldName: oldFileName, 
        newName: validNewFileName 
      };
    } catch (error) {
      console.error(`Error renaming file ${oldFileName} to ${newFileName}:`, error);
      return { success: false, error: error.message };
    }
  }
};

export default StorageService;