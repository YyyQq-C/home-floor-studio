import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};
/** 限定 3D 懒加载或渲染错误的影响范围，保留编辑和项目导出。 */
export default class PreviewErrorBoundary extends Component<Props,State> {
  state:State={failed:false};
  /** 将异常转换为可恢复的错误视图。 */
  static getDerivedStateFromError():State{return {failed:true}}
  /** 记录 3D 预览异常，便于诊断。 */
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Failed to render 3D preview',error,info.componentStack)}
  /** 渲染正常内容或返回二维编辑的提示。 */
  render(){return this.state.failed?<div className="preview-error" role="alert">3D 预览加载失败。可切换回“2D 编辑”继续操作并导出项目备份；保存后刷新页面可重试。</div>:this.props.children}
}
