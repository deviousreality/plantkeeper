import type { FormPlant } from '#components';
import type { UploadFile } from '~/types/input-file-upload';
import type { PlantModelPost } from '~/types/plant-models';

export function useFormPlant(plantId?: number) {
  const router = useRouter();
  const route = useRoute();
  const auth = useAuth();
  const isLoading = ref(false);
  const isSaving = ref(false);
  const formPlant = ref<InstanceType<typeof FormPlant>>();

  const plantFormData = ref<PlantModelPost | undefined>(
    plantId
      ? undefined
      : {
          user_id: auth.user.value?.id as number,
          id: undefined,
          name: '',
          species_id: undefined,
          family_id: undefined,
          genus_id: undefined,
          acquired_date: new Date().toISOString().split('T')[0],
          notes: undefined,
          is_favorite: false,
          can_sell: false,
          is_personal: false,
          common_name: undefined,
          flower_color: undefined,
          variety: undefined,
          light_pref: undefined,
          water_pref: undefined,
          soil_type: undefined,
          plant_use: undefined,
          has_fragrance: false,
          fragrance_description: undefined,
          is_petsafe: false,
          plant_zones: undefined,
          personal_count: undefined,
          created_at: '',
          updated_at: '',
        }
  );

  const imageFormData = ref<UploadFile[]>([]);

  async function fetchPlant(): Promise<void> {
    isLoading.value = true;

    try {
      const plantData = await $fetch(`/api/plants/${plantId}`);
      plantFormData.value = plantData as PlantModelPost;
    } catch (err: unknown) {
      console.error('Error fetching plant:', err);
    } finally {
      isLoading.value = false;
    }
  }

  function handleImages(uploadFiles: UploadFile[]): void {
    imageFormData.value = uploadFiles;
  }

  async function savePlant(plantMethod: 'POST' | 'PUT'): Promise<void> {
    try {
      if (!auth.user.value?.id) {
        alert('You must be logged in to add a plant.');
        router.push('/login');
        return;
      }

      if (formPlant.value?.validate()) {
        isSaving.value = true;
      } else {
        alert('Please fix the errors in the form before saving.');
        return;
      }
      // Prepare data for API using the new schema
      const plantData = {
        user_id: auth.user.value?.id,
        name: plantFormData.value?.name.trim(),
        species_id: plantFormData.value?.species_id,
        family_id: plantFormData.value?.family_id,
        genus_id: plantFormData.value?.genus_id,
        acquired_date: plantFormData.value?.acquired_date,
        notes: plantFormData.value?.notes,
        is_favorite: plantFormData.value?.is_favorite,
        is_personal: plantFormData.value?.is_personal,
        can_sell: plantFormData.value?.can_sell,
        common_name: plantFormData.value?.common_name,
        variety: plantFormData.value?.variety,
        flower_color: plantFormData.value?.flower_color,
        light_pref: plantFormData.value?.light_pref,
        water_pref: plantFormData.value?.water_pref,
        soil_type: plantFormData.value?.soil_type,
        plant_use: plantFormData.value?.plant_use,
        has_fragrance: plantFormData.value?.has_fragrance,
        fragrance_description: plantFormData.value?.fragrance_description,
        is_petsafe: plantFormData.value?.is_petsafe,
        plant_zones: plantFormData.value?.plant_zones,
        personal_count: plantFormData.value?.personal_count, // Use personal count if provided
      } as PlantModelPost;
      let plantId: number | undefined = plantFormData.value?.id;
      if (plantMethod === 'PUT' && plantId) {
        // update plant
        await $fetch(`/api/plants/${plantId}`, {
          method: 'PUT',
          body: plantData,
        });
      } else {
        // create new plant
        const plant = await $fetch('/api/plants', {
          method: plantMethod as 'POST',
          body: plantData,
        });

        console.log('Received response:', plant);

        // Redirect to the new plant's page
        plantId = plant?.id;
        if (!plantId) {
          console.error('No plant ID in response:', plant);
          throw new Error('No plant ID returned from server');
        }
      }

      // Create personal plant entry if is_personal is checked
      if (plantFormData.value?.is_personal && plantFormData?.value?.personal_count) {
        try {
          const personalData = {
            plant_id: plantId,
            count: plantFormData.value.personal_count,
          };

          await $fetch('/api/personal', {
            method: 'POST',
            body: personalData,
          });

          console.log('Personal plant entry created successfully');
        } catch (personalError) {
          console.error('Error creating personal plant entry:', personalError);
          // Don't fail the whole operation, just log the error
        }
      }

      if (imageFormData.value.length > 0) {
        for (const file of imageFormData.value) {
          try {
            if (!(file.file instanceof File) && file.guid && file.markForDelete) {
              await $fetch(`/api/plant_photos/plants/${plantId}/${file.guid}`, {
                method: 'DELETE',
              });
            } else {
              const formData = new FormData();
              formData.append('plant_id', plantId?.toString() as string);
              formData.append('image', file.file as File);

              await $fetch(`/api/plant_photos`, {
                method: 'POST',
                body: formData,
              });
              console.log(`Image ${file.file?.name} uploaded successfully`);
            }
          } catch (imageError) {
            console.error(`Error uploading image ${file.file?.name}:`, imageError);
          }
        }
      }
      router.push(`/plants/${plantId}`);
    } catch (error) {
      console.error('Error saving plant:', error);
      alert('Failed to save plant. Please try again.');
    } finally {
      isSaving.value = false;
    }
  }

  return { isLoading, isSaving, fetchPlant, formPlant, handleImages, plantFormData, imageFormData, savePlant };
}
