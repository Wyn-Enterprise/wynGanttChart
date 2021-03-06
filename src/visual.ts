import '../style/visual.less';
import { gantt } from 'dhtmlx-gantt';

export default class Visual extends WynVisual {
    private container: HTMLDivElement;
    private isMock: boolean;
    private properties: any;
    private className: any;

    constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
        super(dom, host, options);
        this.container = dom;
    }

    private configGantt() {
        gantt.config.readonly = true;
        gantt.config.date_format = "%Y-%m-%d %H:%i";
        gantt.config.show_unscheduled = true;
        gantt.i18n.setLocale("en");
        gantt.config.scale_unit = "week";
        gantt.config.date_scale = "%Y";
        //gantt.config.scale_unit = "month";
        gantt.config.scale_height = 50;
        gantt.config.min_column_width = this.properties.dateColumnWidth;
        gantt.config.select_task = false;
        gantt.config.subscales = [
            {
                unit: 'day',
                step: 1,
                date: '%m-%d',
            }
        ];
        gantt.config.columns = [
            {
                name: "text",
                label: this.properties.label,
                tree: true,
                width: this.properties.projectWidth
            }
        ];
        gantt.config.open_tree_initially = this.properties.showDetail;
    }

    public update(options: VisualNS.IVisualUpdateOptions) {
        this.properties = options.properties;
        this.configGantt();
        if (this.className) {
            this.container.classList.remove(this.className);
        }
        this.container.classList.add(this.properties.style);
        this.className = this.properties.style;
        gantt.init(this.container.id);
        this.isMock = true;
        let self = this;
        let ganttData = [];
        let statusArr = [];
        let mockGanttData = [
            { id: 1, text: "Project1", color: '#FF8C00' },
            { parent: 1, text: "Requesting Research", start_date: "2019-07-25 00:00", end_date: "2019-07-31 00:00", progress: 0.6, state: 'finished', color: '#FFD700' },
            { parent: 1, text: "Product Design", start_date: "2019-07-28 00:00", end_date: "2019-07-30 00:00", progress: 0.6, state: 'unfinished', color: '#FF8C00' },
            { parent: 1, text: "Development", start_date: "2019-08-01 15:00:00", end_date: "2019-08-05 00: 00", state: 'canceled', color: '#FF0000' },
            { id: 2, text: "Project2", color: '#FF8C00' },
            { parent: 2, text: "Requesting Research", start_date: "2019-07-20 00:00", end_date: "2019-07-25 00:00", state: 'finished', color: '#FFD700' },
            { parent: 2, text: "Product Design", start_date: "2019-07-25 00:00", end_date: "2019-07-30 00:00", state: 'unfinished', color: '#FF8C00' }
        ];
        if (options.dataViews[0]) {
            let profile = options.dataViews[0].plain.profile;
            let profileName = {};
            for (let item in profile) {
                if (profile[item].values.length) {
                    profileName[item] = profile[item].values[0].display;
                }
            }

            if (!profileName['taskName']) {
                profileName['taskName'] = profileName['projectName'];
                delete profileName['projectName'];
            }

            let dataArray = options.dataViews[0].plain.data;
            let taskColors = this.properties.taskColors;
            statusArr = profileName['status'] && options.dataViews[0].plain.sort[profileName['status']].order;
            let bindProjectObj = {};
            let projectObj = {};
            dataArray.forEach((data) => {
                let reg = /\d{4}\-\d{2}\-\d{2}T\d{2}\:\d{2}\:\d{2}/;
                if ((data[profileName['startTime']] != null && !reg.test(data[profileName['startTime']].toString())) || (data[profileName['endTime']] != null && !reg.test(data[profileName['endTime']].toString()))) {
                    ganttData = mockGanttData;
                    return;
                }
                this.isMock = false;

                let projectName = data[profileName['projectName']];
                if (!bindProjectObj[projectName]) {
                    bindProjectObj[projectName] = [data];
                } else {
                    bindProjectObj[projectName].push(data);
                }
            })

            let projectIndexArr = Object.keys(bindProjectObj);
            for (let projectIndex in bindProjectObj) {
                let parentId = projectIndexArr.indexOf(projectIndex) + 1;
                projectObj[projectIndex] = [];
                bindProjectObj[projectIndex].forEach((item) => {
                    function convertDate(date) {
                        let dateString = item[profileName[date]];
                        if (dateString == null) {
                            switch (self.properties.nullEndDate) {
                                case "startDate":
                                    dateString = item[profileName["startTime"]].toString();
                                    break;
                                case "today":
                                    dateString = new Date().toISOString();
                                    break;
                                case "futureDate":
                                    let daysInFuture = self.properties.daysInFuture;
                                    let tempDate;
                                    if (self.properties.relativeTo == "relativeToStartDate") {
                                        tempDate = new Date(item[profileName["startTime"]]);
                                    }
                                    else if (self.properties.relativeTo == "relativeToToday") {
                                        tempDate = new Date();
                                    }
                                    tempDate.setDate(tempDate.getDate() + daysInFuture);
                                    dateString = tempDate.toISOString();
                                    break;
                            }
                        }
                        else
                            dateString = item[profileName[date]].toString();
                        return dateString.replace(/T/g, ' ');
                    }

                    function getColor(status) {
                        let index = statusArr.indexOf(status);
                        let colorIndex = index % taskColors.length;
                        return taskColors[colorIndex];
                    }

                    let task = {
                        text: item[profileName['taskName']],
                        start_date: convertDate('startTime'),
                        end_date: convertDate('endTime'),
                        color: this.properties.projectColor
                    }

                    if (profileName['projectName']) {
                        task['parent'] = parentId;
                    }

                    if (profileName['progress']) {
                        task['progress'] = item[profileName['progress']];
                    }

                    if (statusArr) {
                        task['status'] = item[profileName['status']];
                        task['color'] = getColor(item[profileName['status']])
                    }

                    projectObj[projectIndex].push(task);
                })
                if (profileName['projectName']) {
                    let parentItem = {
                        id: parentId,
                        text: projectIndex,
                        color: this.properties.projectColor
                    }
                    projectObj[projectIndex].unshift(parentItem);
                }
            }
            for (let project of Object.values(projectObj)) {
                ganttData = ganttData.concat(project);
            }
        } else {
            ganttData = mockGanttData;
        }
        this.renderData(ganttData);
    }

    public renderData(data): void {
        this.container.style.opacity = this.isMock ? '0.5' : '1';
        gantt.clearAll();
        gantt.parse({
            data: data
        });
    }

    public onDestroy(): void {

    }

    public onResize(): void {

    }

    public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
        if (options.properties.nullEndDate === 'startDate' || options.properties.nullEndDate === 'today') {            
            return ['relativeTo', 'daysInFuture'];
        }
        return null;
    }

    public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
        return null;
    }

    public getColorAssignmentConfigMapping(dataViews: VisualNS.IDataView[]): VisualNS.IColorAssignmentConfigMapping {
        return null;
    }
}