import ModalGrid from "./ModalGrid";
import Timeline from "./Timeline";

const TimelineModal = ({ modalControl, closeModalCallback, setModalControl, title, scrollable, timelineData, id, ...props }) => {
    return (
        <>
            <ModalGrid
                height="h-full"
                size="md"
                title={title ?? "Histórico"}
                scrollable={scrollable}
                btnCancel={"FECHAR"}
                contentClass={`p-4`}
                footerClass={`items-center justify-end`}
                id={id}
                modalControl={modalControl}
                closeModalCallback={closeModalCallback}
                setModalControl={setModalControl}
            >
                <div className="col-span-12">
                    {timelineData && <Timeline data={timelineData} />}
                </div>

            </ModalGrid>
        </>
    );
};

export default TimelineModal;