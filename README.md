# CAN 总线负载计算器

[点此进入计算器](https://lc6464.github.io/CANbus-Load-Calculator/ "GitHub Pages")

> 算法来源于 <a href="https://bbs.robomaster.com/article/557395" target="_blank" title="RoboMaster 论坛相关文章">RoboMaster 论坛</a>。

贡献者（时间顺序）：
- [西南石油大学-铁人](https://github.com/CaFeZn)
- [LC](https://github.com/lc6464)
- [MeroT](https://github.com/tearncolour)

欢迎为[此存储库](https://github.com/lc6464/CANbus-Load-Calculator "GitHub 存储库")做出贡献！

### 工具说明：

一般 CAN 总线负载在 80% 以内都是安全的，再高就要考虑各种干扰的影响了，有概率会开始丢包。

尽可能将多个不足 8 字节的包合并为一个数据帧，可以减少帧头帧尾的数量，以提高总线利用率。

在计算器中给出的一个一拖四 7 电机计算样例——7 电机反馈频率 1000Hz，控制频率 500Hz 的极限情况下是可以控制的，但具体情况还需要考虑布线方式、总线电阻等多方面因素，实际负载会偏高。

### 常见帧类型说明：
- 一拖四协议的电机：反馈帧 8 字节，一条控制帧内每个电机 2 字节，上限 8 字节，即 4 电机。不足 4 电机时缩短数据段长度能有效提高利用率。
- 达妙电机 MIT 模式：反馈帧 8 字节，控制帧 8 字节，一收一发，反馈帧频率随控制帧频率变化。