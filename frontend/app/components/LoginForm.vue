<script setup lang="ts">
interface Props {
  error?: string;
}
const props = defineProps<Props>();
</script>

<template>
  <form
    class="wrapped loginWrapper"
    method="post"
  >
    <div class="inputWrapper">
      <input
        id="username"
        class="usernameInput inputField"
        name="username"
        type="text"
        placeholder="Username"
        required
      >
      <input
        id="password"
        class="passwordInput inputField"
        name="password"
        type="password"
        placeholder="Password"
        required
      >
    </div>
    <div class="buttonAndOutputWrapper">
      <DefaultButton
        class="submitButton"
        type="submit"
      >
        Login
      </DefaultButton>

      <span
        v-if="props.error !== undefined"
        class="error"
      >{{ props.error }}</span>
    </div>
  </form>
</template>

<style scoped>
.submitButton {
    color: var(--color-blue1);
    border-color: var(--color-blue1);

    margin-right: 1rem;
}

.submitButton:hover {
    color: var(--main-bg-color);
    background-color: var(--color-blue1);
}

#username {
    margin-right: 0.25rem;
}

#password {
    margin-left: 0.25rem;
}

.loginWrapper {
    background-color: var(--second-bg-color);

    display: flex;
    flex-direction: column;

    justify-content: center;
    align-items: center;

    border-radius: 0.5rem;

    width: fit-content;
    padding: 0.5rem;
}

.inputWrapper {
    width: fit-content;
    margin-bottom: 0.3rem;
}

.buttonAndOutputWrapper {
    width: 100%;
}

.error {
    color: var(--color-red3);
    margin: auto;
}
</style>
