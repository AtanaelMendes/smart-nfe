import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import NoDataFound from './NoDataFound';

/* data = { title: string, time: string, description: string }[] */
const Timeline = ({ data }) => {
    const renderTimeline = () => {
        if (data.length == 0) {
            return (
                <NoDataFound></NoDataFound>
            );
        }
        
        return data?.map((row, index) => {
            return (
                <li className="mb-4 ms-6 shadow-md p-2 rounded-lg" key={`timelapse-${index}`}>
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -start-3 ring-6 ring-white text-blue-600">
                        <FontAwesomeIcon icon={faClockRotateLeft} width="18" height="18" />
                    </span>
                    <h3 className="mb-1 ml-2 text-sm font-semibold text-gray-900">{row?.title}</h3>
                    <time className="block mb-2 ml-2 text-sm font-normal leading-none text-gray-500">{row?.time}</time>
                    <div className="text-sm font-normal text-gray-600 ml-2 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:list-inside [&>ol]:list-inside" dangerouslySetInnerHTML={{ __html: row?.description }} />
                </li>
            );
        })
    }

    return (
        <ol className="relative border-l-2 border-gray-300 pb-40">
            {renderTimeline()}
        </ol>
    );
}
export default Timeline;