import dynamic from 'next/dynamic'
import Loading from '@/components/Layouts/Loading'
const PieChart = dynamic(() => import('@/components/chart/PieChart'), {
	ssr: false,
})
import { empty } from '@/assets/utils'

const UsoChatBotAnalistas = ({ chartData, isReady }) => {
	return (
		<>
			{!isReady ? (
				<Loading active={true} className='mt-8 relative' />
			) : !empty(chartData) ? (
				<PieChart chartData={chartData} nmChart='usoChatBotUnidade' />
			) : (
				<div className='text-center text-xl p-3 font-semibold min-h-64'>
					<h1 className='mt-[80px]'>Nenhuma mensagem enviada no período selecionado!</h1>
				</div>
			)}
		</>
	)
}

export default UsoChatBotAnalistas
