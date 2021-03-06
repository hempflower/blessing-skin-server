<template>
  <form @submit.prevent="submit">
    <div class="form-group has-feedback">
      <input
        ref="email"
        v-model="email"
        type="email"
        class="form-control"
        :placeholder="$t('auth.email')"
      >
      <span class="glyphicon glyphicon-envelope form-control-feedback" />
    </div>

    <captcha ref="captcha" />

    <div class="callout callout-success" :class="{ hide: !successMsg }">{{ successMsg }}</div>
    <div class="callout callout-info" :class="{ hide: !infoMsg }">{{ infoMsg }}</div>
    <div class="callout callout-warning" :class="{ hide: !warningMsg }">{{ warningMsg }}</div>

    <div class="row">
      <div class="col-xs-7">
        <a v-t="'auth.forgot.login-link'" :href="`${baseUrl}/auth/login`" class="text-center" />
      </div>
      <div class="col-xs-5">
        <el-button
          type="primary"
          native-type="submit"
          :disabled="pending"
          class="auth-btn"
        >
          <template v-if="pending">
            <i class="fa fa-spinner fa-spin" /> {{ $t('auth.sending') }}
          </template>
          <span v-else>{{ $t('auth.forgot.button') }}</span>
        </el-button>
      </div>
    </div>
  </form>
</template>

<script>
import Captcha from '../../components/Captcha.vue'

export default {
  name: 'Forgot',
  components: {
    Captcha,
  },
  props: {
    baseUrl: {
      type: String,
      default: blessing.base_url,
    },
  },
  data: () => ({
    email: '',
    successMsg: '',
    infoMsg: '',
    warningMsg: '',
    pending: false,
  }),
  methods: {
    async submit() {
      const { email } = this

      if (!email) {
        this.infoMsg = this.$t('auth.emptyEmail')
        this.$refs.email.focus()
        return
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        this.infoMsg = this.$t('auth.invalidEmail')
        this.$refs.email.focus()
        return
      }

      this.pending = true
      const { errno, msg } = await this.$http.post(
        '/auth/forgot',
        { email, captcha: await this.$refs.captcha.execute() }
      )
      if (errno === 0) {
        this.infoMsg = ''
        this.warningMsg = ''
        this.successMsg = msg
        this.pending = false
      } else {
        this.infoMsg = ''
        this.warningMsg = msg
        this.pending = false
        this.$refs.captcha.refresh()
      }
    },
  },
}
</script>
