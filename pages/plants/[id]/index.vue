<!-- pages/plants/[id].vue -->
<template>
  <div>
    <v-row v-if="loading">
      <v-col
        cols="12"
        class="text-center">
        <v-progress-circular indeterminate />
        <div class="mt-3">Loading plant details...</div>
      </v-col>
    </v-row>

    <div
      v-else-if="error"
      class="text-center pa-5">
      <v-alert
        type="error"
        title="Error Loading Plant">
        {{ error }}
      </v-alert>
      <v-btn
        class="mt-4"
        color="primary"
        to="/plants">
        Back to Plants
      </v-btn>
    </div>

    <template v-else>
      <!-- Back button and actions bar -->
      <div class="d-flex justify-space-between align-center mb-6">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-arrow-left"
          to="/plants">
          Back to Plants
        </v-btn>
        <div>
          <v-btn
            color="warning"
            class="me-2"
            @click="toggleFavorite">
            <v-icon>
              {{ plant?.is_favorite ? 'mdi-star' : 'mdi-star-outline' }}
            </v-icon>
            {{ plant?.is_favorite ? 'Favorite' : 'Add to Favorites' }}
          </v-btn>
          <v-btn
            color="primary"
            class="me-2"
            :to="`/plants/${plant?.id}/edit`">
            <v-icon>mdi-pencil</v-icon>
            Edit
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDelete = true">
            <v-icon>mdi-delete</v-icon>
            Delete
          </v-btn>
        </div>
      </div>

      <v-row>
        <!-- Plant info -->
        <v-col
          cols="12"
          md="6">
          <v-card class="mb-4">
            <v-img
              :src="'/images/default-plant.jpg'"
              height="300"
              cover
              class="align-end">
              <template #placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-icon
                    size="64"
                    color="grey">
                    mdi-flower
                  </v-icon>
                </div>
              </template>
            </v-img>

            <v-card-title class="text-h4">
              {{ plant?.name }}
            </v-card-title>

            <v-card-text>
              <v-list>
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-flower</v-icon>
                  </template>
                  <v-list-item-title>Species</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ plant?.species_id ? `Species ID: ${plant.species_id}` : 'Unknown' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title>Acquired</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ plant?.acquired_date ? formatDate(plant.acquired_date) : 'Unknown' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <!-- TODO: Implement later
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-water</v-icon>
                  </template>
                  <v-list-item-title>Last Watered</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ plant?.last_watered ? formatDate(plant.last_watered) : "Never" }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-fertilizer</v-icon>
                  </template>
                  <v-list-item-title>Last Fertilized</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ plant?.last_fertilized ? formatDate(plant.last_fertilized) : "Never" }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-weather-sunny</v-icon>
                  </template>
                  <v-list-item-title>Light Needs</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ plant?.light_needs || "Not specified" }}
                  </v-list-item-subtitle>
                </v-list-item>
                -->
              </v-list>

              <v-expansion-panels
                variant="accordion"
                class="mt-4">
                <v-expansion-panel title="Notes">
                  <template #text>
                    <div class="py-2">
                      {{ plant?.notes || 'No notes yet.' }}
                    </div>
                  </template>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Care history and actions -->
        <v-col
          cols="12"
          md="6">
          <!-- Propagation widget -->
          <!-- TODO: Implement propagation API later
          <PropagationWidget :plant-id="plant?.id || 0" class="mb-4" @propagation-added="refreshPlantData" />
          -->

          <!-- Action buttons -->
          <v-card class="mb-4">
            <v-card-title>Plant Care</v-card-title>
            <v-card-text>
              <div class="d-flex flex-wrap gap-3">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-water"
                  :loading="careActionLoading === 'watering'"
                  @click="recordCareAction('watering')">
                  Record Watering
                </v-btn>

                <v-btn
                  color="success"
                  prepend-icon="mdi-fertilizer"
                  :loading="careActionLoading === 'fertilizing'"
                  @click="recordCareAction('fertilizing')">
                  Record Fertilizing
                </v-btn>

                <v-btn
                  color="info"
                  prepend-icon="mdi-clipboard-text"
                  :loading="careActionLoading === 'pruning'"
                  @click="recordCareAction('pruning')">
                  Record Pruning
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <!-- Care tips -->
          <!-- TODO: Implement later
          <v-card v-if="careTips.length" class="mb-4">
            <v-card-title>Care Tips</v-card-title>
            <v-card-text>
              <v-list lines="two">
                <v-list-item v-for="(tip, index) in careTips" :key="index">
                  <v-list-item-title>
                    <v-icon color="info" class="me-2" icon="mdi-lightbulb" />
                    {{ tip.tip }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="tip.source" class="text-grey">
                    Source: {{ tip.source }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
          -->

          <!-- Care history -->
          <!-- TODO: Implement later
          <v-card>
            <v-card-title>Care History</v-card-title>
            <v-card-text v-if="!careLogs.length">
              <v-alert type="info" variant="tonal"> No care history recorded yet. </v-alert>
            </v-card-text>
            <v-list v-else>
              <v-list-item v-for="log in careLogs" :key="log.id">
                <template #prepend>
                  <v-icon :icon="getCareLogIcon(log.action_type)" />
                </template>
                <v-list-item-title>
                  {{ formatCareAction(log.action_type) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatDate(log.action_date) }}
                  <span v-if="log.notes" class="ms-2">- {{ log.notes }}</span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
          -->
        </v-col>
      </v-row>
    </template>

    <!-- Delete confirmation dialog -->
    <v-dialog
      v-model="confirmDelete"
      max-width="500px">
      <v-card>
        <v-card-title class="text-h5"> Delete Plant </v-card-title>
        <v-card-text> Are you sure you want to delete {{ plant?.name }}? This action cannot be undone. </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            @click="confirmDelete = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deleteLoading"
            @click="deletePlant">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Care action dialog -->
    <v-dialog
      v-model="showCareDialog"
      max-width="500px">
      <v-card>
        <v-card-title>{{ formatCareAction(currentCareAction) }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveCareAction">
            <p>
              Recording
              {{ formatCareAction(currentCareAction).toLowerCase() }} for {{ plant?.name }}.
            </p>
            <v-text-field
              v-model="careNotes"
              label="Notes (optional)"
              placeholder="Any details about this care action" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            @click="showCareDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="success"
            :loading="careActionLoading === 'saving'"
            @click="saveCareAction">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Plant, PlantFormData } from '~/types/database';

definePageMeta({
  middleware: 'auth',
});

const route = useRoute();
const router = useRouter();
const plantId = route.params['id'] as string;

// Data
const plant = ref<Plant | undefined>(undefined);
// TODO: Implement later
// const careTips = ref<Array<{id: number; tip: string; source?: string}>>([]);
// const careLogs = ref<Array<{id: number; action_type: string; action_date: string; notes?: string}>>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const confirmDelete = ref(false);
const deleteLoading = ref(false);
const showCareDialog = ref(false);
const currentCareAction = ref('');
const careNotes = ref('');
const careActionLoading = ref<string | null>(null);

// Fetch plant data
async function fetchPlantData(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const plantData = await $fetch(`/api/plants/${plantId}`);
    plant.value = plantData as Plant;
    // TODO: Implement later
    // careLogs.value = plantData.careLogs || [];
    // careTips.value = plantData.careTips || [];

    // If there's a species_id, we might want to fetch additional species data
    // For now, we'll use the basic plant data
  } catch (e) {
    console.error('Error fetching plant:', e);
    error.value = 'Failed to load plant data. Please try again.';
  } finally {
    loading.value = false;
  }
}

// Record care action
function recordCareAction(action: string): void {
  currentCareAction.value = action;
  careNotes.value = '';
  showCareDialog.value = true;
}

// Save care action to database
async function saveCareAction(): Promise<void> {
  careActionLoading.value = 'saving';

  try {
    await $fetch(`/api/plants/${plantId}/care`, {
      method: 'POST',
      body: {
        actionType: currentCareAction.value,
        notes: careNotes.value,
      },
    });

    // Update the plant data with new dates
    // TODO: Implement later
    // if (plant.value) {
    //   if (currentCareAction.value === "watering") {
    //     plant.value.last_watered = new Date().toISOString().split("T")[0];
    //   } else if (currentCareAction.value === "fertilizing") {
    //     plant.value.last_fertilized = new Date().toISOString().split("T")[0];
    //   }
    // }

    // Add the new log to the list
    // TODO: Implement later
    // careLogs.value.unshift({
    //   id: response.id,
    //   action_type: currentCareAction.value,
    //   action_date: new Date().toISOString(),
    //   notes: careNotes.value,
    // });

    showCareDialog.value = false;
  } catch (e) {
    console.error('Error recording care action:', e);
    alert('Failed to record care action. Please try again.');
  } finally {
    careActionLoading.value = null;
  }
}

// Delete the plant
async function deletePlant(): Promise<void> {
  deleteLoading.value = true;

  try {
    await $fetch(`/api/plants/${plantId}`, {
      method: 'DELETE',
    });

    confirmDelete.value = false;
    router.push('/plants');
  } catch (e) {
    console.error('Error deleting plant:', e);
    alert('Failed to delete plant. Please try again.');
  } finally {
    deleteLoading.value = false;
  }
}

// Toggle favorite status
async function toggleFavorite(): Promise<void> {
  if (!plant.value) return;

  try {
    // Update the plant's favorite status
    const updatedPlant = {
      ...plant.value,
      is_favorite: !plant.value.is_favorite,
    };

    // Save to server
    await $fetch(`/api/plants/${plantId}`, {
      method: 'PUT',
      body: updatedPlant,
    });

    // Update local state
    plant.value.is_favorite = !plant.value.is_favorite;
  } catch (e) {
    console.error('Error updating favorite status:', e);
    alert('Failed to update favorite status. Please try again.');
  }
}

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// TODO: Implement later
// function getCareLogIcon(actionType: string): string {
//   const icons: Record<string, string> = {
//     watering: "mdi-water",
//     fertilizing: "mdi-fertilizer",
//     pruning: "mdi-content-cut",
//     repotting: "mdi-flower-pot",
//     treatment: "mdi-medical-bag",
//   };
//
//   return icons[actionType] || "mdi-clipboard-text";
// }

function formatCareAction(actionType: string): string {
  return actionType.charAt(0).toUpperCase() + actionType.slice(1);
}

// Load data on component mount
onMounted(() => {
  fetchPlantData();
});
</script>
