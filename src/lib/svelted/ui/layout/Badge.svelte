<script lang="ts">
type Config = { label: string; icon: string };
interface IProps {
  status: true | false;
  config: { true: Config; false: Config };
}
let { status, config }: IProps = $props();
</script>

<span
  class="badge shrink-0 gap-1 badge-sm {
    status ? 'badge-success' : 'badge-neutral'
  }">
  {config[`${status}`].icon}
  {config[`${status}`].label}
</span>
