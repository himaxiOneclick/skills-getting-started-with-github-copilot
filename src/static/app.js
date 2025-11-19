document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  // --- Confirmation modal utility ---
  // Creates (once) a confirm modal and returns a promise that resolves to true/false
  function createConfirmModal() {
    let modal = document.getElementById("confirm-modal");
    if (modal) return {
      open: (message) => new Promise((res) => {
        const txt = modal.querySelector(".confirm-message");
        txt.textContent = message;
        modal.classList.add("open");
        const onConfirm = () => { cleanup(); res(true); };
        const onCancel = () => { cleanup(); res(false); };
        function cleanup() {
          confirmBtn.removeEventListener("click", onConfirm);
          cancelBtn.removeEventListener("click", onCancel);
          modal.classList.remove("open");
        }
        const confirmBtn = modal.querySelector(".confirm-ok");
        const cancelBtn = modal.querySelector(".confirm-cancel");
        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
      })
    };

    modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "confirm-modal";
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <p class="confirm-message"></p>
        <div class="confirm-actions">
          <button class="confirm-cancel">Cancel</button>
          <button class="confirm-ok">Yes, remove</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    return {
      open: (message) => new Promise((res) => {
        const txt = modal.querySelector(".confirm-message");
        txt.textContent = message;
        modal.classList.add("open");
        const onConfirm = () => { cleanup(); res(true); };
        const onCancel = () => { cleanup(); res(false); };
        function cleanup() {
          confirmBtn.removeEventListener("click", onConfirm);
          cancelBtn.removeEventListener("click", onCancel);
          modal.classList.remove("open");
        }
        const confirmBtn = modal.querySelector(".confirm-ok");
        const cancelBtn = modal.querySelector(".confirm-cancel");
        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
      })
    };
  }

  const confirmModal = createConfirmModal();

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (avoid duplicate entries on re-load)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build content with a participants section
        const title = document.createElement("h4");
        title.textContent = name;

        const desc = document.createElement("p");
        desc.textContent = details.description;

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;

        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        activityCard.appendChild(title);
        activityCard.appendChild(desc);
        activityCard.appendChild(schedule);
        activityCard.appendChild(availability);

        // Participants heading + list
        const participantsHeading = document.createElement("p");
        participantsHeading.innerHTML = "<strong>Participants:</strong>";
        activityCard.appendChild(participantsHeading);

        const participantsListEl = document.createElement("ul");
        participantsListEl.className = "participants";

        if (!details.participants || details.participants.length === 0) {
          const empty = document.createElement("li");
          empty.className = "participant-empty";
          empty.textContent = "No participants yet";
          participantsListEl.appendChild(empty);
        } else {
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const badge = document.createElement("span");
            badge.className = "participant-badge";
            badge.textContent = p;

            // Delete icon/button (trash SVG)
            const del = document.createElement("button");
            del.className = "participant-delete";
            del.setAttribute("title", "Remove participant");
            del.setAttribute("aria-label", `Remove ${p}`);
            del.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;

            // Click handler with confirmation modal
            del.addEventListener("click", async (e) => {
              e.preventDefault();
              const confirmed = await confirmModal.open(`Remove ${p} from ${name}?`);
              if (!confirmed) return;

              // Call DELETE endpoint to remove participant
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                const resJson = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = resJson.message || "Participant removed";
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");

                  // Smoothly remove the list item
                  li.classList.add("removing");
                  setTimeout(() => {
                    li.remove();
                    // If no participants left, refresh to show empty state
                    if (!participantsListEl.querySelector("li")) {
                      fetchActivities();
                    }
                  }, 260);
                } else {
                  messageDiv.textContent = resJson.detail || "Failed to remove participant";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                }

                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              } catch (err) {
                console.error("Error unregistering participant:", err);
                messageDiv.textContent = "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              }
            });

            li.appendChild(badge);
            li.appendChild(del);
            participantsListEl.appendChild(li);
          });
        }

        activityCard.appendChild(participantsListEl);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
