<template>
  <section class="content">
    <vue-good-table
      mode="remote"
      :rows="players"
      :total-rows="totalRecords || players.length"
      :columns="columns"
      :search-options="tableOptions.search"
      :pagination-options="tableOptions.pagination"
      style-class="vgt-table striped"
      @on-page-change="onPageChange"
      @on-sort-change="onSortChange"
      @on-search="onSearch"
      @on-per-page-change="onPerPageChange"
    >
      <template #table-row="props">
        <span v-if="props.column.field === 'name'">
          {{ props.formattedRow[props.column.field] }}
          <a :title="$t('admin.changePlayerName')" data-test="name" @click="changeName(props.row)">
            <i class="fas fa-edit btn-edit" />
          </a>
        </span>
        <span v-else-if="props.column.field === 'uid'">
          <a
            :href="`${baseUrl}/admin/users?uid=${props.row.uid}`"
            :title="$t('admin.inspectHisOwner')"
            data-toggle="tooltip"
            data-placement="right"
          >{{ props.formattedRow[props.column.field] }}</a>
          <a :title="$t('admin.changeOwner')" data-test="owner" @click="changeOwner(props.row)">
            <i class="fas fa-edit btn-edit" />
          </a>
        </span>
        <span v-else-if="props.column.field === 'preview'">
          <a
            v-if="props.row.tid_skin"
            :href="`${baseUrl}/skinlib/show/${props.row.tid_skin}`"
          >
            <img :src="`${baseUrl}/preview/64/${props.row.tid_skin}.png`" width="64">
          </a>
          <a
            v-if="props.row.tid_cape"
            :href="`${baseUrl}/skinlib/show/${props.row.tid_cape}`"
          >
            <img :src="`${baseUrl}/preview/64/${props.row.tid_cape}.png`" width="64">
          </a>
        </span>
        <span v-else-if="props.column.field === 'operations'">
          <el-button
            data-toggle="modal"
            data-target="#modal-change-texture"
            size="medium"
            @click="textureChanges.originalIndex = props.row.originalIndex"
          >{{ $t('admin.changeTexture') }}</el-button>
          <el-button
            type="danger"
            size="medium"
            @click="deletePlayer(props.row)"
          >{{ $t('admin.deletePlayer') }}</el-button>
        </span>
        <span v-else v-text="props.formattedRow[props.column.field]" />
      </template>
    </vue-good-table>

    <div
      id="modal-change-texture"
      class="modal fade"
      tabindex="-1"
      role="dialog"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button
              type="button"
              class="close"
              data-dismiss="modal"
              aria-label="Close"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4 v-t="'admin.changeTexture'" class="modal-title" />
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label v-t="'admin.textureType'" />
              <select v-model="textureChanges.type" class="form-control">
                <option v-t="'general.skin'" value="skin" />
                <option v-t="'general.cape'" value="cape" />
              </select>
            </div>
            <div class="form-group">
              <label>TID</label>
              <input
                v-model.number="textureChanges.tid"
                class="form-control"
                type="text"
                :placeholder="$t('admin.pidNotice')"
              >
            </div>
          </div>
          <div class="modal-footer">
            <el-button data-dismiss="modal">{{ $t('general.close') }}</el-button>
            <el-button type="primary" data-test="changeTexture" @click="changeTexture">
              {{ $t('general.submit') }}
            </el-button>
          </div>
        </div><!-- /.modal-content -->
      </div><!-- /.modal-dialog -->
    </div>
  </section>
</template>

<script>
import { VueGoodTable } from 'vue-good-table'
import 'vue-good-table/dist/vue-good-table.min.css'
import tableOptions from '../../components/mixins/tableOptions'
import serverTable from '../../components/mixins/serverTable'

export default {
  name: 'PlayersManagement',
  components: {
    VueGoodTable,
  },
  mixins: [
    tableOptions,
    serverTable,
  ],
  props: {
    baseUrl: {
      type: String,
      default: blessing.base_url,
    },
  },
  data() {
    return {
      players: [],
      columns: [
        {
          field: 'pid', label: 'PID', type: 'number',
        },
        { field: 'name', label: this.$t('general.player.player-name') },
        {
          field: 'uid', label: this.$t('general.player.owner'), type: 'number',
        },
        {
          field: 'preview', label: this.$t('general.player.previews'), globalSearchDisabled: true, sortable: false,
        },
        { field: 'last_modified', label: this.$t('general.player.last-modified') },
        {
          field: 'operations', label: this.$t('admin.operationsTitle'), globalSearchDisabled: true, sortable: false,
        },
      ],
      textureChanges: {
        originalIndex: -1,
        type: 'skin',
        tid: '',
      },
    }
  },
  beforeMount() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      const { data, totalRecords } = await this.$http.get(
        `/admin/player-data${location.search}`,
        !location.search && this.serverParams
      )
      this.totalRecords = totalRecords
      this.players = data
    },
    async changeTexture() {
      const player = this.players[this.textureChanges.originalIndex]
      const { type, tid } = this.textureChanges

      const { errno, msg } = await this.$http.post(
        '/admin/players?action=texture',
        {
          pid: player.pid, type, tid,
        }
      )
      if (errno === 0) {
        player[`tid_${type}`] = tid
        this.$message.success(msg)
        $('.modal').modal('hide')
      } else {
        this.$message.warning(msg)
      }
    },
    async changeName(player) {
      let value
      try {
        ({ value } = await this.$prompt(this.$t('admin.changePlayerNameNotice'), {
          inputValue: player.name,
          inputValidator: name => !!name || this.$t('admin.emptyPlayerName'),
        }))
      } catch {
        return
      }

      const { errno, msg } = await this.$http.post(
        '/admin/players?action=name',
        { pid: player.pid, name: value }
      )
      if (errno === 0) {
        player.name = value
        this.$message.success(msg)
      } else {
        this.$message.warning(msg)
      }
    },
    async changeOwner(player) {
      let value
      try {
        ({ value } = await this.$prompt(this.$t('admin.changePlayerOwner'), {
          inputValue: player.uid,
        }))
      } catch {
        return
      }

      const { errno, msg } = await this.$http.post(
        '/admin/players?action=owner',
        { pid: player.pid, uid: value }
      )
      if (errno === 0) {
        player.uid = value
        this.$message.success(msg)
      } else {
        this.$message.warning(msg)
      }
    },
    async deletePlayer({ pid, originalIndex }) {
      try {
        await this.$confirm(this.$t('admin.deletePlayerNotice'), {
          type: 'warning',
        })
      } catch {
        return
      }

      const { errno, msg } = await this.$http.post(
        '/admin/players?action=delete',
        { pid }
      )
      if (errno === 0) {
        this.$delete(this.players, originalIndex)
        this.$message.success(msg)
      } else {
        this.$message.warning(msg)
      }
    },
  },
}
</script>
